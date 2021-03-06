import Client from './Client.js'
import Notification from './Notification.js'
import jsonSafeParse from './utils/jsonSafeParse.js'
import lerp from './utils/lerp.js'

const WebSocket = window.WebSocket || window.MozWebSocket

class WSClient {
    constructor(room = 'global') {
        this.ws = new WebSocket(`ws://canvas.peha.fun?room=${room}`)
        this.room = room
        this.clients = new Map()
        this.batch = []

        this.ws.onmessage = this.onMessage.bind(this)
        this.ws.onclose = this.onClose.bind(this)

        this.run()
    }

    run() {
        setInterval(() => {
            if (this.batch.length) {
                this.ws.send(JSON.stringify(this.batch))
                this.batch = []
            }
        }, 1000 / 30)
    }

    send(type, data) {
        if (this.ws.readyState === this.ws.OPEN) {
            this.batch.push({ type, data })
        }
    }

    onMessage(message) {
        const {
            type,
            id,
            data = {},
            t,
        } = jsonSafeParse(message.data)
    
        const client = this.clients.get(id)

        switch (type) {
            case 'chat':
                Notification.create(`
                    <span class='circle' style='background-color: ${client.color};'></span>${data.text}
                `.trim(), 3500)
                break
            case 'new-client':
                Notification.create(`
                    <span class='circle' style='background-color: ${data.color};'></span>New user has been <b>connected</b>
                `.trim())

                this.clients.set(id, new Client(id, data))
                break
            case 'close':
                Notification.create(`
                    <span class='circle' style='background-color: ${client.color};'></span>User has been <b>disconnected</b>
                `.trim())

                this.clients.delete(id)
                break
            case 'clients':
                Notification.create(`You connected to the <b>${this.room || 'global'}</b> room.<br><b>Online:</b> ${data.clients.length}`)

                this.color = data.client.color
                
                data.clients.forEach(client => {
                    this.clients.set(client.id, new Client(client.id, client))
                })
                break
            case 'startDraw':
                client.strokes.push({
                    points: [{
                        x: data.x,
                        y: data.y,
                    }],
                })
                break
            case 'mouse':
                if (data.isDrawing) {
                    client.strokes[client.strokes.length - 1].points.push({
                        x: data.x,
                        y: data.y,
                    })
                }

                client.mouse.x = lerp(client.prevMouse.x, data.x, .5)
                client.mouse.y = lerp(client.prevMouse.y, data.y, .5)

                client.prevMouse.x = client.mouse.x
                client.prevMouse.y = client.mouse.y

                // client.mouse.x = data.x
                // client.mouse.y = data.y

                client.t = t
        }
    }

    onClose(e) {
        console.log(e)
    }
}

export default WSClient
