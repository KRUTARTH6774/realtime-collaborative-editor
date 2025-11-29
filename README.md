# Realtime Collaborative Editor

A real-time collaborative text editor built using **GraphQL**, **Subscriptions**, **WebSockets**, **Node.js**, and **React**.  
Multiple users can edit the same document simultaneously and see updates instantly — similar to a simplified Google Docs.

---

## 🚀 Features

- **Real-time content sync** using GraphQL Subscriptions  
- **Live collaboration across multiple browser tabs**  
- **WebSocket transport using `graphql-ws`**  
- **Backend: Node.js + Express + Apollo Server**  
- **Frontend: React + Apollo Client (Vite)**  
- **In-memory document storage (easy to extend)**  
- **Instant updates without refreshing**  

---

## 🏗 Tech Stack

### Backend
- Node.js  
- Express  
- Apollo Server (v3)  
- GraphQL  
- GraphQL Subscriptions  
- `graphql-ws`  
- `graphql-subscriptions`  
- WebSocket server (`ws`)  

### Frontend
- React  
- Vite  
- Apollo Client  
- `graphql-ws`  

---

## 📂 Project Structure

```
realtime-collaborative-editor/
│
├── backend/
│   ├── src/
│   │   ├── index.ts         # Express + Apollo Server + GraphQL-WS setup
│   │   ├── schema.ts        # GraphQL schema
│   │   ├── resolvers.ts     # Query, Mutation, Subscription resolvers
│   │   └── ...
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx          # Editor UI + subscription handling
    │   ├── apolloClient.ts  # HTTP + WS links
    │   └── ...
    └── package.json
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```
git clone https://github.com/KRUTARTH6774/realtime-collaborative-editor.git
cd realtime-collaborative-editor
```

---

# 🛠 Backend Setup

```
cd backend
npm install
npm run dev
```

Backend will run at:

- HTTP GraphQL → http://localhost:4000/graphql  
- WS GraphQL → ws://localhost:4000/graphql  

---

# 💻 Frontend Setup

```
cd frontend
npm install
npm run dev
```

Frontend will run at:

http://localhost:5173

Open **two browser windows** to test real-time sync.

---

## 🔁 How Real-Time Sync Works

1. User types in the editor  
2. React triggers a **debounced GraphQL mutation** (`updateDocument`)  
3. Backend updates content in memory  
4. Backend publishes an event:  
   - `pubsub.publish("DOCUMENT_UPDATED_1", { documentUpdated: doc })`
5. All clients subscribed to:
   ```
   subscription DocumentUpdated($id: ID!) {
     documentUpdated(id: $id) {
       id
       content
     }
   }
   ```
   immediately receive the update  
6. UI updates in real time — **no refresh, no polling**  

---

## 🧪 Testing Subscriptions in Apollo Sandbox

### Tab 1 → Subscription

```
subscription DocumentUpdated($id: ID!) {
  documentUpdated(id: $id) {
    id
    content
  }
}
```

Variables:

```
{ "id": "1" }
```

### Tab 2 → Mutation

```
mutation UpdateDocument($id: ID!, $content: String!) {
  updateDocument(id: $id, content: $content)
}
```

Variables:

```
{ "id": "1", "content": "Hello from mutation!" }
```

**Tab 1 instantly receives the updated content.**

---

## 🎯 Future Enhancements

- Replace textarea with a **rich text editor** (TipTap, Slate)  
- Show active users + cursor positions  
- Add OT/CRDT for conflict resolution  
- Persist documents in a real database  
- Add Redis for horizontal scaling  
- Add authentication + multiple documents  

---

## 📜 License

MIT License — feel free to use, modify, and distribute.
