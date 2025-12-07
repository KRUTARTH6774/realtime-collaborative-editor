// src/RichTextEditor.tsx
import React, { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RemoteUser = {
    userId: string;
    name: string;
    color: string;
    cursorPos?: number | null;
};

type RichTextEditorProps = {
    value: string;
    onChange: (html: string, cursorPos: number | null) => void;
    localUserId: string;
    localUserColor: string;
    remoteUsers: RemoteUser[];
};


const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, localUserId, localUserColor, remoteUsers }) => {
    const isApplyingRemote = useRef(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        autofocus: true,
        onUpdate({ editor }) {
            if (isApplyingRemote.current) return;
            const html = editor.getHTML();
            const pos = editor.state.selection.from ?? null;
            onChange(html, pos);
        },
        onSelectionUpdate({ editor }) {
            if (isApplyingRemote.current) return;
            const html = editor.getHTML();
            const pos = editor.state.selection.from ?? null;
            onChange(html, pos);
        },
    });


    // When 'value' from server changes (query/subscription), update editor content
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();

        if (value && value !== current) {
            isApplyingRemote.current = true;
            editor.commands.setContent(value, false);
            isApplyingRemote.current = false;
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div className="editor-wrapper">
            {/* tiny toolbar: bold/italic + headings */}
            <div className="editor-toolbar">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive("bold") ? "is-active" : ""}
                >
                    B
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive("italic") ? "is-active" : ""}
                >
                    I
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
                >
                    H2
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive("bulletList") ? "is-active" : ""}
                >
                    • List
                </button>
            </div>

            <div className="editor-content">
                <EditorContent editor={editor} />
            </div>
            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", opacity: 0.7 }}>
                {remoteUsers.filter((u) => u.cursorPos != null)
                    .map((u) => (
                        <div key={u.userId}>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: u.color,
                                    marginRight: 4,
                                }}
                            />
                            {u.name} cursor at position {u.cursorPos}
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default RichTextEditor;
