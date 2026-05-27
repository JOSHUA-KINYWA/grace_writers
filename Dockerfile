FROM node:20.11.1

WORKDIR /app

COPY . .

ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder_key
ENV BREVO_SENDER_EMAIL=placeholder@example.com
ENV ADMIN_EMAIL=admin@example.com
ENV BREVO_SMTP_HOST=smtp.placeholder.com
ENV BREVO_SMTP_PORT=587
ENV BREVO_SMTP_SECURE=false
ENV BREVO_SMTP_USER=placeholder_user
ENV BREVO_API_KEY=placeholder_key

RUN npm ci --no-audit --no-fund

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
