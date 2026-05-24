const http = require('http')

const data = JSON.stringify({
  to: 'gracewriters82@gmail.com',
  subject: 'Raw HTTP test',
  text: 'Hello raw',
  html: '<p>Hello raw</p>'
})

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/send-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', (chunk) => (body += chunk))
  res.on('end', () => {
    console.log('status', res.statusCode)
    console.log('body', body)
  })
})

req.on('error', (e) => {
  console.error('request error', e)
})

req.write(data)
req.end()
