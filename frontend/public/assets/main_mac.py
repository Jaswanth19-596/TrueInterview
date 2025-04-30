import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import requests
import psutil
import os
import time
import getpass
from urllib.parse import urlparse

SERVER_URL = os.environ.get("SERVER_URL", "https://trueinterview-1fwm.onrender.com")
MAX_RETRIES = 3
RETRY_DELAY = 5

# List of apps to monitor
MONITORED_APPS = [
    "interview coder",
    "luely",
    "chrome",
    "firefox",
    "safari",
    "zoom.us",
    "slack",
    "teams",
    "vscode",
    "pycharm",
    "intellij",
    "terminal",
    "iterm2",
    "activity monitor",
    "system preferences",
    "finder"
]

class InterviewMonitorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Interview Process Monitor")
        self.root.geometry("700x500")
        self.running = False

        self.session_key = ""
        self.room_id = ""

        self.setup_ui()

    def setup_ui(self):
        frame = ttk.Frame(self.root, padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Room ID:").grid(row=0, column=0, sticky="w")
        self.room_entry = ttk.Entry(frame, width=50)
        self.room_entry.grid(row=0, column=1, pady=5)

        ttk.Label(frame, text="Session Key:").grid(row=1, column=0, sticky="w")
        self.session_entry = ttk.Entry(frame, width=50, show="*")
        self.session_entry.grid(row=1, column=1, pady=5)

        self.start_button = ttk.Button(frame, text="Start Monitoring", command=self.start_monitoring)
        self.start_button.grid(row=2, column=1, sticky="e", pady=10)

        self.log_box = scrolledtext.ScrolledText(frame, height=20, state='disabled', font=("Consolas", 10))
        self.log_box.grid(row=3, column=0, columnspan=2, pady=10)

        self.stop_button = ttk.Button(frame, text="Stop Monitoring", command=self.stop_monitoring, state='disabled')
        self.stop_button.grid(row=4, column=1, sticky="e")

    def log(self, message):
        self.log_box.config(state='normal')
        self.log_box.insert(tk.END, message + "\n")
        self.log_box.see(tk.END)
        self.log_box.config(state='disabled')

    def stop_monitoring(self):
        self.running = False
        self.log("\n🛑 Monitoring stopped.")
        self.stop_button.config(state='disabled')
        self.start_button.config(state='normal')

    def validate_url(self, url):
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False

    def get_process_info(self):
        app_status = {app: False for app in MONITORED_APPS}
        current_user = getpass.getuser()
        
        for proc in psutil.process_iter(['name']):
            try:
                proc_name = proc.info['name'].lower()
                for app in MONITORED_APPS:
                    if app in proc_name:
                        app_status[app] = True
            except:
                continue

        return app_status

    def check_room(self, room_id, session_key):
        for attempt in range(MAX_RETRIES):
            try:
                headers = {"x-session-key": session_key}
                res = requests.get(f"{SERVER_URL}/room-status/{room_id}", headers=headers, timeout=10)
                if res.status_code == 404:
                    self.log("❌ Room not found.")
                    return False, False, False
                elif res.status_code == 403:
                    self.log("❌ Invalid session key.")
                    return True, False, False
                elif res.status_code != 200:
                    self.log(f"⚠️ Server error {res.status_code}, retrying...")
                    time.sleep(RETRY_DELAY)
                    continue
                data = res.json()
                return True, data.get('interviewerConnected', False), data.get('intervieweeConnected', False)
            except Exception as e:
                self.log(f"⚠️ Connection error: {e}, retrying...")
                time.sleep(RETRY_DELAY)
        return True, False, False

    def monitor(self):
        url = f"{SERVER_URL}/send_processes/{self.room_id}"
        headers = {"x-session-key": self.session_key}
        i = 0
        consecutive_errors = 0
        last_both_online = False

        while self.running:
            i += 1
            self.log(f"\n🔁 Iteration {i}")
            room_valid, interviewer, interviewee = self.check_room(self.room_id, self.session_key)

            if not room_valid:
                self.log("❌ Room no longer valid. Stopping.")
                break

            if interviewer and interviewee:
                if not last_both_online:
                    self.log("✅ Both interviewer and interviewee are connected.")
                    last_both_online = True
            else:
                if last_both_online:
                    self.log("⚠️ One or both participants went offline.")
                    last_both_online = False
                if not interviewer:
                    self.log("⚠️ Interviewer offline.")
                if not interviewee:
                    self.log("⚠️ Interviewee offline.")
                time.sleep(5)
                continue

            data = self.get_process_info()
            if not data:
                self.log("⚠️ No data collected.")
                time.sleep(5)
                continue

            try:
                res = requests.post(url, json=data, headers=headers, timeout=10)
                if res.status_code == 200:
                    self.log(f"✅ Data sent. Status: {res.status_code}")
                    consecutive_errors = 0
                else:
                    self.log(f"⚠️ Server error: {res.status_code}")
                    consecutive_errors += 1
            except Exception as e:
                self.log(f"❌ Send error: {e}")
                consecutive_errors += 1

            if consecutive_errors >= 5:
                self.log("❌ Too many errors. Stopping.")
                break

            time.sleep(5)

        self.stop_monitoring()

    def start_monitoring(self):
        self.room_id = self.room_entry.get().strip()
        self.session_key = self.session_entry.get().strip()

        if not self.room_id or not self.session_key:
            messagebox.showerror("Input Error", "Room ID and Session Key cannot be empty.")
            return

        self.start_button.config(state='disabled')
        self.stop_button.config(state='normal')
        self.running = True
        self.log("\n🚀 Starting monitoring...")

        thread = threading.Thread(target=self.monitor, daemon=True)
        thread.start()

if __name__ == "__main__":
    root = tk.Tk()
    app = InterviewMonitorApp(root)
    root.mainloop()
