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

if __name__ == "__main__":
    student_id = "ADJC7F"
    url = f"http://localhost:5001/send_processes/{student_id}"

    for i in range(10):  # Run 10 iterations
        print(f"\nIteration {i + 1}")
        data = get_process_info()
        print(f"Found {len(data)} user processes")

        try:
            response = requests.post(url, json=data)
            print(f"Sent data at {time.strftime('%H:%M:%S')} | Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Error occurred: {e}")

        time.sleep(5)
