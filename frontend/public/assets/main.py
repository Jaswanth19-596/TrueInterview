import requests
import psutil
import os
import time
import getpass

def get_process_info():
    processes = []
    current_user = getpass.getuser()  # More reliable across OSes

    for proc in psutil.process_iter(['name', 'status', 'username', 'pid']):
        try:
            proc_info = proc.as_dict(attrs=['name', 'status', 'username', 'pid'])
            memory_info = proc.memory_info()

            # Only include processes run by the current user
            if proc_info['username'] and current_user in proc_info['username']:
                process_entry = {
                    'processName': proc_info['name'],
                    'status': proc_info['status'],
                    'pid': proc_info['pid'],
                    'memoryMB': round(memory_info.rss / (1024 * 1024), 1)
                }

                # Add 'user' field only on non-Windows
                if os.name != 'nt':
                    process_entry['user'] = proc_info['username']

                processes.append(process_entry)

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return processes

def is_room_valid_and_both_online(room_id, session_key=None):
    try:
        headers = {}
        if session_key:
            headers = {"x-session-key": session_key}
            
        response = requests.get(
            f"http://localhost:5001/room-status/{room_id}", 
            headers=headers
        )
        
        if response.status_code == 404:
            print("❌ Room not found. The room has been deleted.")
            return False, False, False
        elif response.status_code == 403:
            print("❌ Invalid session key. Please check your Session Key.")
            return True, False, False  # Room exists but we can't access it
        elif response.status_code != 200:
            print(f"⚠️ Server error while checking room. Status: {response.status_code}")
            return True, False, False  # Assume room exists but there's a temporary error
        
        status = response.json()
        interviewer_connected = status.get('interviewerConnected', False)
        interviewee_connected = status.get('intervieweeConnected', False)
        
        # Return room validity and whether both participants are connected
        return True, interviewer_connected, interviewee_connected
    
    except requests.exceptions.RequestException as e:
        print(f"Error checking room status: {e}")
        return True, False, False  # Assume room exists but there's a connection error

if __name__ == "__main__":
    student_id = input("Enter Room ID: ")
    session_key = input("Enter Session Key: ")
    
    url = f"http://localhost:5001/send_processes/{student_id}"
    headers = {"x-session-key": session_key}
    
    # Validate Room using our function
    room_valid, interviewer_connected, interviewee_connected = is_room_valid_and_both_online(student_id, session_key)
    
    if not room_valid:
        print("❌ Room validation failed. Exiting.")
        exit(1)
    
    if not interviewer_connected:
        print("⚠️ Interviewer is not connected. Waiting for both participants to be online.")
    
    if not interviewee_connected:
        print("⚠️ Interviewee is not connected. Waiting for both participants to be online.")
    
    print("✅ Room found and authenticated.")
    i = 0
    last_both_online = False
    
    while True:
        print(f"\n🔁 Iteration {i + 1}")
        i += 1
        
        # Check room status before sending data
        room_valid, interviewer_connected, interviewee_connected = is_room_valid_and_both_online(student_id, session_key)
        
        if not room_valid:
            print("❌ Room no longer exists. Exiting.")
            exit(0)
        
        # Report status
        if interviewer_connected and interviewee_connected:
            if not last_both_online:
                print("✅ Both interviewer and interviewee are now connected!")
                last_both_online = True
        else:
            if last_both_online:
                print("⚠️ One or both participants are offline. Waiting to send data.")
                last_both_online = False
                
            if not interviewer_connected:
                print("⚠️ Interviewer is offline. Data will not be sent.")
            if not interviewee_connected:
                print("⚠️ Interviewee is offline. Data will not be sent.")
                
            time.sleep(5)
            continue  # Skip sending data if not both online
        
        # Only proceed if both are connected
        # Get the process data
        data = get_process_info()
        
        try:
            data.sort(key = lambda x : x['memoryMB'], reverse=True)
            response = requests.post(url, json=data, headers=headers)
            print(f"✅ Data sent at {time.strftime('%H:%M:%S')} | Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error occurred while sending data: {e}")

        time.sleep(5)
