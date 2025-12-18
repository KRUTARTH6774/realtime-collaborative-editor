import { useEffect, useState, useRef } from "react";
import { gql } from 'graphql-tag';
import {
  useQuery,
  useMutation,
  useSubscription,
} from '@apollo/client/react';
import RichTextEditor from "./RichTextEditor";
import "./App.css";

// ---------- GraphQL ----------

const GET_DOCUMENT = gql`
  query GetDocument($id: ID!) {
    getDocument(id: $id) {
      id
      title
      content
    }
  }
`;

const LIST_DOCUMENTS = gql`
  query ListDocuments($ownerId: ID!) {
    listDocuments(ownerId: $ownerId) {
      id
      title
      ownerId
    }
  }
`;

const CREATE_DOCUMENT = gql`
  mutation CreateDocument($title: String!, $ownerId: ID!) {
    createDocument(title: $title, ownerId: $ownerId) {
      id
      title
      content
      ownerId
    }
  }
`;

const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($id: ID!, $content: String!, $userId: ID!) {
    updateDocument(id: $id, content: $content, userId: $userId)
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

const UPDATE_PRESENCE = gql`
  mutation UpdatePresence(
    $docId: ID!
    $userId: ID!
    $name: String!
    $color: String!
    $isTyping: Boolean!
    $cursorPos: Int
  ) {
    updatePresence(
      docId: $docId
      userId: $userId
      name: $name
      color: $color
      isTyping: $isTyping
      cursorPos: $cursorPos
    )
  }
`;

const PRESENCE_UPDATED = gql`
  subscription PresenceUpdated($docId: ID!) {
    presenceUpdated(docId: $docId) {
      docId
      users {
        userId
        name
        color
        isTyping
        cursorPos
      }
    }
  }
`;

const DOCUMENT_CREATED = gql`
  subscription DocumentCreated {
    documentCreated {
      id
      title
      content
      ownerId
    }
  }
`;

const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!, $userId: ID!) {
    deleteDocument(id: $id, userId: $userId)
  }
`;

// ---------- Helpers / Types ----------

function randomColor() {
  const colors = ["#0ea5e9", "#22c55e", "#e11d48", "#a855f7", "#f97316"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function loadOrCreate(key: string, create: () => string) {
  if (typeof window === "undefined") return create();
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = create();
  localStorage.setItem(key, value);
  return value;
}

type DocSummary = { id: string; title: string };

type PresenceUser = {
  userId: string;
  name: string;
  color: string;
  isTyping: boolean;
  cursorPos?: number | null;
};

// ---------- App ----------

function App() {
  // document selection
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocSummary[]>([]);

  // current doc content
  const [content, setContent] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // presence
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // identity (stable per browser via localStorage)
  const [userId] = useState(() =>
    loadOrCreate("rt-user-id", () => crypto.randomUUID())
  );
  const [userName] = useState(() =>
    loadOrCreate("rt-user-name", () => `User-${Math.floor(Math.random() * 1000)}`)
  );
  const [userColor] = useState(() =>
    loadOrCreate("rt-user-color", () => randomColor())
  );

  // last content we sent (to ignore our own echo)
  const lastSentContentRef = useRef<string | null>(null);

  // ----- Queries -----

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useQuery<{ listDocuments: (DocSummary & { ownerId: string })[] }>(
    LIST_DOCUMENTS,
    {
      variables: { ownerId: userId },
    }
  );

  const {
    data: docData,
    loading: docLoading,
    error: docError,
  } = useQuery<{ getDocument: { id: string; title: string; content: string } | null }>(
    GET_DOCUMENT,
    {
      variables: { id: currentDocId },
      skip: !currentDocId,
    }
  );

  // ----- Mutations -----

  const [createDocument] = useMutation<
    {
      createDocument: {
        id: string;
        title: string;
        content: string;
        ownerId: string;
      };
    },
    { title: string; ownerId: string }
  >(CREATE_DOCUMENT);

  const [updateDocument] = useMutation<
    { updateDocument: boolean },
    { id: string; content: string; userId: string }
  >(UPDATE_DOCUMENT);

  const [updatePresence] = useMutation<
    { updatePresence: boolean },
    {
      docId: string;
      userId: string;
      name: string;
      color: string;
      isTyping: boolean;
      cursorPos?: number | null;
    }
  >(UPDATE_PRESENCE);

  const [deleteDocument] = useMutation<
    { deleteDocument: boolean },
    { id: string; userId: string }
  >(DELETE_DOCUMENT);

  // ----- Subscriptions -----

  const { data: docSubData } = useSubscription<{
    documentUpdated: { id: string; content: string };
  }>(DOCUMENT_UPDATED, {
    variables: { id: currentDocId },
    skip: !currentDocId,
  });

  const { data: presenceData } = useSubscription<{
    presenceUpdated: { docId: string; users: PresenceUser[] };
  }>(PRESENCE_UPDATED, {
    variables: { docId: currentDocId },
    skip: !currentDocId,
  });

  const { data: createdDocData } = useSubscription<{
    documentCreated: {
      id: string;
      title: string;
      content: string;
      ownerId: string;
    };
  }>(DOCUMENT_CREATED);

  // ---------- Effects ----------

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docFromUrl = params.get("doc");

    if (docFromUrl) {
      setCurrentDocId(docFromUrl);
      setDocuments((prev) => {
        if (prev.some((d) => d.id === docFromUrl)) return prev;
        return [...prev, { id: docFromUrl, title: "Shared document" }];
      });
    }
  }, []);

  // Load document list & pick initial doc
  useEffect(() => {
    if (!listData?.listDocuments) return;
    setDocuments(listData.listDocuments);

    if (!currentDocId && listData.listDocuments.length > 0) {
      setCurrentDocId(listData.listDocuments[0].id);
    }
  }, [listData]);

  useEffect(() => {
    const newDoc = createdDocData?.documentCreated;
    if (!newDoc) return;
    if (newDoc.ownerId === userId) return;

    setDocuments((prev) => {
      // avoid duplicates if this client just created it locally
      if (prev.some((d) => d.id === newDoc.id)) return prev;
      return [...prev, { id: newDoc.id, title: newDoc.title }];
    });
  }, [createdDocData]);

  // When switching documents, reset content state
  useEffect(() => {
    setHasLoaded(false);
    setContent("");
    setDocTitle("");
    setPresenceUsers([]);
  }, [currentDocId]);

  // Hydrate content/title when doc query returns
  useEffect(() => {
    if (!currentDocId) return;
    if (!hasLoaded && docData?.getDocument) {
      setContent(docData.getDocument.content || "");
      setDocTitle(docData.getDocument.title || "");
      setHasLoaded(true);
    }
  }, [docData, hasLoaded, currentDocId]);

  // Presence subscription -> update list of users
  useEffect(() => {
    if (!presenceData?.presenceUpdated) return;
    setPresenceUsers(presenceData.presenceUpdated.users);
  }, [presenceData]);

  // Document subscription -> apply remote changes
  useEffect(() => {
    const newHtml = docSubData?.documentUpdated?.content;
    if (!newHtml) return;

    // Ignore our own echo
    if (newHtml === lastSentContentRef.current) return;

    setContent(newHtml);
  }, [docSubData]);

  // Initial presence when joining a doc
  useEffect(() => {
    if (!currentDocId) return;

    updatePresence({
      variables: {
        docId: currentDocId,
        userId,
        name: userName,
        color: userColor,
        isTyping: false,
        cursorPos: null,
      },
    }).catch(console.error);
  }, [currentDocId, updatePresence, userColor, userId, userName]);

  // Debounced save to server + presence "not typing"
  useEffect(() => {
    if (!isTyping) return;
    if (!currentDocId) return;

    const timeout = setTimeout(() => {
      lastSentContentRef.current = content;

      updateDocument({
        variables: {
          id: currentDocId,
          content,
          userId,
        },
      }).catch((err) => console.error("Update error:", err));

      setIsTyping(false);

      updatePresence({
        variables: {
          docId: currentDocId,
          userId,
          name: userName,
          color: userColor,
          isTyping: false,
          cursorPos: null,
        },
      }).catch(console.error);
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    content,
    isTyping,
    currentDocId,
    updateDocument,
    updatePresence,
    userColor,
    userId,
    userName,
  ]);

  // ---------- Handlers ----------

  const handleEditorChange = (html: string, cursorPos: number | null) => {
    setIsTyping(true);
    setContent(html);

    if (!currentDocId) return;

    updatePresence({
      variables: {
        docId: currentDocId,
        userId,
        name: userName,
        color: userColor,
        isTyping: true,
        cursorPos,
      },
    }).catch(console.error);
  };

  const handleCreateDocument = async () => {
    const title = window.prompt("New document title:", "Untitled");
    if (!title) return;

    try {
      const res = await createDocument({
        variables: { title, ownerId: userId },
      });
      const newDoc = res.data?.createDocument;
      if (newDoc) {
        setDocuments((prev) => [...prev, { id: newDoc.id, title: newDoc.title }]);
        setCurrentDocId(newDoc.id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create document");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const ok = window.confirm("Delete this document permanently?");
    if (!ok) return;

    try {
      const res = await deleteDocument({
        variables: { id, userId },
      });

      const success = res.data?.deleteDocument;
      if (!success) {
        alert("You are not allowed to delete this document.");
        return;
      }

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.id !== id);

        if (currentDocId === id) {
          const next = filtered[0]?.id ?? null;
          setCurrentDocId(next);
        }

        return filtered;
      });

      // Clear editor if we just left the doc
      if (currentDocId === id) {
        setContent("");
        setDocTitle("");
        setPresenceUsers([]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete document");
    }
  };

  // ---------- Loading / error states ----------

  if (listLoading && !currentDocId) {
    return <div style={{ padding: 20 }}>Loading documents…</div>;
  }

  if (listError) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        Error loading documents: {listError.message}
      </div>
    );
  }

  const effectiveDocLoading = docLoading && !hasLoaded;
  const effectiveDocError = docError;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          borderRight: "1px solid #eee",
          padding: "1rem",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Documents</h2>

        <button
          style={{
            width: "100%",
            padding: "0.45rem 0.6rem",
            marginBottom: "0.75rem",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#f9fafb",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
          onClick={handleCreateDocument}
        >
          + New Document
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <button
                style={{
                  flex: 1,
                  textAlign: "left",
                  padding: "0.35rem 0.5rem",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  background:
                    doc.id === currentDocId ? "#e5f2ff" : "transparent",
                }}
                onClick={() => setCurrentDocId(doc.id)}
              >
                {doc.title}
              </button>

              <button
                title="Delete document"
                onClick={() => handleDeleteDocument(doc.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "0.2rem 0.3rem",
                  color: "#888",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          {documents.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#888" }}>
              No documents yet. Create one above.
            </div>
          )}
        </div>

      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        {effectiveDocLoading && (
          <div style={{ padding: 20 }}>Loading document…</div>
        )}

        {effectiveDocError && (
          <div style={{ padding: 20, color: "red" }}>
            Error loading document: {effectiveDocError.message}
          </div>
        )}

        {!currentDocId && !effectiveDocLoading && (
          <div style={{ padding: 20 }}>Select or create a document.</div>
        )}


        {currentDocId && !effectiveDocLoading && (
          <>
            <h1
              style={{
                marginBottom: "0.25rem",
                fontSize: "1.7rem",
                fontWeight: 700,
              }}
            >
              {docTitle || "Untitled Document"}
            </h1>
            <p style={{ marginBottom: "0.75rem", color: "#666" }}>
              ID: <strong>{currentDocId}</strong> · You are{" "}
              <span style={{ fontWeight: 600 }}>{userName}</span>
              <button
                style={{
                  marginLeft: "0.75rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
                onClick={() => {
                  const url = `${window.location.origin}?doc=${currentDocId}`;
                  navigator.clipboard
                    .writeText(url)
                    .then(() => alert("Share link copied to clipboard!"))
                    .catch(() => alert("Failed to copy. You can copy the URL manually."));
                }}
              >
                Share link
              </button>
            </p>

            {/* Presence pills */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {presenceUsers.map((u) => (
                <div
                  key={u.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "999px",
                    background: `${u.color}20`,
                    border: `1px solid ${u.color}60`,
                    fontSize: "0.8rem",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: u.color,
                    }}
                  />
                  <span>{u.name}</span>
                  {u.isTyping && (
                    <span style={{ opacity: 0.7 }}>typing…</span>
                  )}
                </div>
              ))}
            </div>

            {/* Editor */}
            <RichTextEditor
              value={content}
              onChange={handleEditorChange}
              remoteUsers={presenceUsers.filter((u) => u.userId !== userId)}
            />

            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.85rem",
                color: "#888",
              }}
            >
              {isTyping
                ? "Syncing changes…"
                : "All changes saved. Open this page in another browser window to test real-time rich-text updates."}
            </p>
          </>
        )}

      </main>
    </div>
  );
}

export default App;
