export interface LiveChatStarter {
  id: string
  label: string
  message: string
  /** Shown to the client before they send — common answer / guidance */
  answer: string
}

/** Quick FAQ when opening a new live chat thread */
export const LIVE_CHAT_STARTERS: LiveChatStarter[] = [
  {
    id: 'pricing',
    label: 'Pricing',
    message: 'Hello! I would like to know your pricing and packages for my project.',
    answer:
      'Pricing depends on pages, deadline, and subject. Share your brief here and we will send a custom quote.',
  },
  {
    id: 'order-status',
    label: 'Order status',
    message: 'Hi, can you help me check the status of my current order?',
    answer:
      'Please share your order ID or email. We will check progress and update you in this chat.',
  },
  {
    id: 'deadline',
    label: 'Deadline',
    message: 'I need help with a deadline or turnaround time for my assignment.',
    answer:
      'Tell us your due date and page count. We will confirm if we can meet it or suggest the fastest option.',
  },
  {
    id: 'revision',
    label: 'Revisions',
    message: 'I have a question about revisions on my order.',
    answer:
      'Revisions are included per your order terms. Describe what you need changed and we will guide you.',
  },
  {
    id: 'payment',
    label: 'Payment',
    message: 'I need assistance with payment or invoicing.',
    answer:
      'We accept the payment methods shown at checkout. Share your issue and we will help resolve it.',
  },
  {
    id: 'other',
    label: 'Something else',
    message: 'Hi, I have a question about your services.',
    answer: 'Type your question below or pick a topic — our team typically replies within a few hours.',
  },
]
