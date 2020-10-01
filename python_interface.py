import socketio
import time

class python_ws_client(object):
    def __init__(self):
        'Connect to dataset, connect to js server via ws'
        self.sio = socketio.Client()
        self.sio.on('connect', self.socket_connected, namespace='/target_name_space')
        # self.sio.on('message', self.message_received)
        self.sio.on('Pong', self.pong_received, namespace='/target_name_space')
        self.sio.on('Client_room_list', self.fetch_client_rooms, namespace='/target_name_space')
        self.sio.on('disconnect', self.handle_disconnection, namespace='/target_name_space')
        self.sio.connect('http://localhost:9003', namespaces='/target_name_space')

    def reconnect(self):
        print("Trying to reconnect...")
        self.sio.eio.disconnect()
        self.sio.connect('http://localhost:9003', namespaces='/target_name_space')

    def handle_disconnection(self):
        print("Disconnected, get connected again...")

    def socket_connected(self):
        print("Connected with js server")
        print(self.sio.eio.sid)

    def fetch_client_rooms(self, room_list):
        print(f"client room list: {room_list}")

    def pong_received(self, message):
        'on received danmakus'
        print(f"received: {message}")
        print(message - self.ping_time)
        # if message - self.ping_time > 5000:
        #     'after five seconds, you gotta nothing'
        #     "then try to restart the server"

    def send_Ping(self):
        self.ping_time = int(round(time.time() * 1000))
        time.sleep(1)
        self.sio.emit("ping", self.ping_time, namespace='/target_name_space')
        # self.sio.send("hello")
        # self.sio.emit("close_room", 22227221)

if __name__ == '__main__':
    ws_listenser = python_ws_client()

    for _ in range(5):
        ws_listenser.send_Ping()
        ws_listenser.reconnect()