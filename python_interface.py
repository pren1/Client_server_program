import socketio
import time

class python_ws_client(object):
    def __init__(self):
        'Connect to dataset, connect to js server via ws'
        self.sio = socketio.Client()
        self.sio.on('connect', self.socket_connected)
        self.sio.on('message', self.message_received)
        self.sio.on('Pong', self.pong_received)
        self.sio.on('Client_room_list', self.fetch_client_rooms)
        self.sio.on('disconnect', self.handle_disconnection)
        self.sio.connect('http://localhost:9003')

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

    def message_received(self, message):
        print(message)

    def send_Ping(self):
        self.ping_time = int(round(time.time() * 1000))
        time.sleep(1)
        # self.sio.emit("watch_room", 14085407)
        # self.sio.emit("watch_room", 664481)
        # self.sio.emit("close_room", 664481)

        # self.sio.emit("ping", self.ping_time)
        # self.sio.send("hello")
        # self.sio.emit("close_room", 14085407)

if __name__ == '__main__':
    ws_listenser = python_ws_client()
    ws_listenser.send_Ping()
    ws_listenser.send_Ping()
    # ws_listenser.send_Ping()