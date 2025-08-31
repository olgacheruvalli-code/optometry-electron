// src/components/PrintWindow.jsx
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export default function PrintWindow({ children, onClose }) {
  const printWindowRef = useRef(null);

  useEffect(() => {
    const newWindow = window.open("", "_blank", "width=900,height=1200");
    printWindowRef.current = newWindow;

    const doc = newWindow.document;
    doc.write("<html><head><title>Print Preview</title></head><body></body></html>");
    doc.close();

    const container = doc.body;
    ReactDOM.render(children, container);

    // optional: close window when parent unmounts
    return () => {
      newWindow.close();
    };
  }, []);

  return null;
}
