// src/RichTextEditor.tsx
import React, { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
    value: string;                    // HTML from server
    onChange: (html: string) => void; // send updated HTML to parent
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
    const isApplyingRemote = useRef(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        autofocus: true,
        onUpdate({ editor }) {
            if (isApplyingRemote.current) return;   // ignore remote-triggered updates
            const html = editor.getHTML();
            onChange(html);                         // local update only
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
        </div>
    );
};

export default RichTextEditor;
