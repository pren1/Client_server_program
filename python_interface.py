import socketio

class python_ws_client(object):
    def __init__(self):
        'Connect to dataset, connect to js server via ws'
        self.sio = socketio.Client()
        self.sio.on('connect', self.socket_connected)
        self.sio.on('message', self.message_received)
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

    def message_received(self, message):
        'on received danmakus'
        print(f"received: {message}")

    # def send_message(self):
    #     self.sio.emit("message", "Hello from python.")
    #     # self.sio.send("hello")
    #     self.sio.emit("close_room", 22227221)

if __name__ == '__main__':
    ws_listenser = python_ws_client()
    # ws_listenser.send_message()