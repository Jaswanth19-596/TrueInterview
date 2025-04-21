import requests
import psutil
import os
import time

def get_process_info():
    processes = []
    current_user = os.getlogin()

    for proc in psutil.process_iter(['name', 'status', 'username', 'pid']):
        try:
            proc_info = proc.as_dict(attrs=['name', 'status', 'username', 'pid'])
            memory_info = proc.memory_info()

            if proc_info['username']:
                if os.name == 'nt':  # Windows
                    system_users = ['NT AUTHORITY\\SYSTEM', 'NT AUTHORITY\\LOCAL SERVICE', 
                                    'NT AUTHORITY\\NETWORK SERVICE', 'SYSTEM']
                    if proc_info['username'] not in system_users and current_user in proc_info['username']:
                        processes.append({
                            'processName': proc_info['name'],
                            'status': proc_info['status'],
                            'pid': proc_info['pid'],
                            'memoryMB': round(memory_info.rss / (1024 * 1024), 1)
                        })
                else:  # Unix/Linux/Mac
                    if proc_info['username'] != 'root' and proc_info['username'] == current_user:
                        processes.append({
                            'processName': proc_info['name'],
                            'status': proc_info['status'],
                            'pid': proc_info['pid'],
                            'user': proc_info['username'],
                            'memoryMB': round(memory_info.rss / (1024 * 1024), 1)
                        })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return processes

def is_room_valid_and_interviewer_online(room_id):
    try:
        response = requests.get(f"http://localhost:5001/room-status/{room_id}")
        if response.status_code == 404:
            print("❌ Room not found. Please check the Room ID.")
            return False, False
        elif response.status_code != 200:
            print(f"⚠️ Server error while checking room. Status: {response.status_code}")
            return False, False
        
        status = response.json()
        return True, status.get('interviewerConnected', False)
    
    except requests.exceptions.RequestException as e:
        print(f"Error checking room status: {e}")
        return False, False

if __name__ == "__main__":
    student_id = input("Enter Room ID: ")
    url = f"http://localhost:5001/send_processes/{student_id}"

    # Validate Room
    room_exists, interviewer_online = is_room_valid_and_interviewer_online(student_id)
    if not room_exists:
        exit(1)

    print("✅ Room found.")

    while(True):  
        print(f"\n🔁 Iteration {i + 1}")

        _, interviewer_online = is_room_valid_and_interviewer_online(student_id)

        if not interviewer_online:
            print("🕒 Interviewer is not online. Skipping this round.")
        else:
            print("📡 Interviewer is online. Sending metrics...")
            data = get_process_info()
            data.sort(key=lambda x: x['memoryMB'], reverse=True)

            try:
                response = requests.post(url, json=data)
                print(f"✅ Data sent at {time.strftime('%H:%M:%S')} | Status: {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"❌ Error occurred while sending data: {e}")

        time.sleep(5)
