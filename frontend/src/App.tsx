import { useEffect, useState } from "react";
import { gql } from 'graphql-tag';
import {
  useQuery,
  useMutation,
  useSubscription,
} from '@apollo/client/react';


import './App.css'

const DOCUMENT_ID = "1"; // hardcode for now
const GET_DOCUMENT = gql`
  query GetDocument($id: ID!) {
    getDocument(id: $id) {
      id
      content
    }
  }
`;

const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($id: ID!, $content: String!) {
    updateDocument(id: $id, content: $content)
  }
`;

const DOCUMENT_UPDATED = gql`
  subscription DocumentUpdated($id: ID!) {
    documentUpdated(id: $id) {
      id
      content
    }
  }
`;

function App() {
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 1) Initial document query
  const { data, loading, error } = useQuery(GET_DOCUMENT, {
    variables: { id: DOCUMENT_ID },
  });

  // 2) Update document mutation
  const [updateDocument] = useMutation(UPDATE_DOCUMENT);

  // 3) Listen for remote updates (from other clients)
  const { data: subData } = useSubscription(DOCUMENT_UPDATED, {
    variables: { id: DOCUMENT_ID },
  });
  useEffect(() => {
    if (subData) {
      console.log("📡 Subscription event:", subData);
    }
  }, [subData]);
  // ✅ Only hydrate from initial query ONCE
  useEffect(() => {
    if (!hasLoaded && data?.getDocument?.content != null) {
      setContent(data.getDocument.content);
      setHasLoaded(true);
    }
  }, [data, hasLoaded]);

  // ✅ Apply subscription updates (from other clients / from backend)
  useEffect(() => {
    if (subData?.documentUpdated?.content != null) {
      // Optionally skip if you're currently typing to avoid flicker
      if (!isTyping) {
        setContent(subData.documentUpdated.content);
      }
    }
  }, [subData, isTyping]);

  // ✅ Debounced mutation – no more overwriting
  useEffect(() => {
    if (!isTyping) return;

    const timeout = setTimeout(() => {
      updateDocument({
        variables: {
          id: DOCUMENT_ID,
          content,
        },
      }).catch((err) => console.error("Update error:", err));

      setIsTyping(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [content, isTyping, updateDocument]);

  if (loading && !hasLoaded) {
    return <div style={{ padding: 20 }}>Loading document...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        Error: {error.message}
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIsTyping(true);
    setContent(e.target.value);
  };
  return (
    <>
      <div
        style={{
          padding: "2rem",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ marginBottom: "1rem" }}>Real-Time Collaborative Doc</h1>
        <p style={{ marginBottom: "0.5rem", color: "#666" }}>
          Document ID: <strong>{DOCUMENT_ID}</strong>
        </p>

        <textarea
          value={content}
          onChange={handleChange}
          rows={18}
          style={{
            width: "100%",
            fontSize: "1rem",
            fontFamily: "monospace",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #ddd",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            resize: "vertical",
          }}
        />

        <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#888" }}>
          {isTyping
            ? "Syncing changes..."
            : "All changes saved. Open this page in another browser window to test real-time updates."}
        </p>
      </div>
    </>
  )
}

export default App
