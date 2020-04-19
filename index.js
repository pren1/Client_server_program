const http = require('http')
const socketIO = require('socket.io')
const got = require('got')
const { LiveWS } = require('bilibili-live-ws')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const rooms = new Set()
const on_live_rooms = []

//const reg = /【(.*)】|【(.*)|(.*)】/;
const reg = /(.*)【(.*)|(.*)】(.*)|^[(（"“‘]|$[)）"”’]/

var app = http.createServer()
var server = app.listen(9003, function () {
  console.log('Node.js server created')
})
var io = socketIO(server, { pingTimeout: 60000 })

io.on('connection', function (socket) {
  console.log('socket.io connected with python_interface program ' + socket.id)
  // io.send("Hello from node.js")
  // give commands here

  socket.on('watch_room', function (data) {
    console.log(`Server: You should watch room ${data}`)
    watch({ roomid: data, mid: 123 })
  })

  socket.on('close_room', function (data) {
    console.log(`Server: You should close room ${data}`)
    close_target_room(data)
  })
  // socket.on("message", function(data) {
  //   console.log("Received message")
  //   console.log(data)
  //   close_target_room(21264737)
  // })
})

const openRoom = ({ roomid }) =>
  new Promise((resolve) => {
    console.log(`OPEN: ${roomid}`)
    const live = new LiveWS(roomid)
    on_live_rooms.push({ name: roomid, value: live })
    const autorestart = setTimeout(() => {
      console.log(`AUTORESTART: ${roomid}`)
      live.close()
    }, 1000 * 60 * 60 * 18)
    let timeout = setTimeout(() => {
      console.log(`TIMEOUT: ${roomid}`)
      live.close()
    }, 1000 * 45)
    live.once('live', () => console.log(`LIVE: ${roomid}`))
    live.on('DANMU_MSG', async ({ info }) => {
      if (!info[0][9]) {
        var message = info[1]
        const mid = info[2][0]
        const uname = info[2][1]
        const timestamp = info[0][4]
        let matchres = message.match(reg)
        // Only send matches message to python client
        if (matchres && matchres.length > 0){
          // remove all 【】from message
          // message = message.replace(/[【】(（"“‘)）"”’]/g, "")
          message_length = message.replace(/[【】(（"“‘)）"”’]/g, "").length
          io.send({ message, message_length, roomid, mid, uname, timestamp})
        }
        console.log({ message, roomid, mid, uname, timestamp })
      }
    })

    live.on('heartbeat', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        console.log(`TIMEOUT: ${roomid}`)
        live.close()
      }, 1000 * 45)
    })
    live.on('close', () => {
      clearTimeout(autorestart)
      clearTimeout(timeout)
      resolve({ roomid })
    })
    live.on('error', () => {
      console.log(`ERROR: ${roomid}`)
    })
  })

const watch = async ({ roomid, mid }) => {
  if (!rooms.has(roomid)) {
    rooms.add(roomid)
    console.log(`WATCH: ${roomid}`)
    await openRoom({ roomid, mid })
    // if failed, retry 10 times
    for (i = 0; i < 10; i++) {
      // if failed, check target roomid falls within the on_live_rooms or not...
      if (typeof on_live_rooms.find((e) => e.name === roomid) !== 'undefined') {
        await openRoom({ roomid, mid })
        console.log(`CLOSE: ${roomid}`)
        await wait(50 * i)
        console.log(`REOPEN: ${roomid}`)
      } else {
        console.log('Room closed by remote')
        break
      }
    }
  } else {
    console.log('room has had this room!')
  }
}

const close_target_room = (roomid) => {
  // Find result
  let result = on_live_rooms.find((e) => e.name === roomid)
  if (typeof result !== 'undefined') {
    delete_target_roomid_from_on_live_rooms(roomid, result)
    rooms.delete(roomid)
    result.value.close()
    console.log(`roomid: ${roomid} closed`)
  } else {
    console.log(`${roomid} not exist`)
  }
}

const delete_target_roomid_from_on_live_rooms = (roomid, result) => {
  console.log(`Before close: ${on_live_rooms.length}`)
  // Then, remove target from the list
  const index = on_live_rooms.indexOf(result)
  if (index > -1) {
    console.log(`find index: ${index}`)
    on_live_rooms.splice(index, 1)
    console.log(`After delete: ${on_live_rooms.length}`)
  } else {
    console.log('failed to find target roomid')
  }
}

const available_room_list = async () => {
  const data = await got('https://api.vtbs.moe/v1/info').json()
  var i
  var counter = 0
  for (i = 0; i < data.length; i++) {
    if (data[i]['liveStatus'] === 1) {
      counter += 1
      if (counter >= 18) {
        break
      }
      console.log(data[i]['roomid'])
      watch({ roomid: data[i]['roomid'], mid: 123 })
    }
  }
}

// available_room_list();
// watch({roomid:21264737,mid:123});
