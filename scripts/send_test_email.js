(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'gracewriters82@gmail.com',
        subject: 'Node test email',
        text: 'Hello from node test',
        html: '<p>Hello from node test</p>'
      })
    })

    const text = await res.text()
    console.log('status', res.status)
    console.log(text)
  } catch (e) {
    console.error('request failed', e)
    process.exit(1)
  }
})()
