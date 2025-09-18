import React from "react";
export default class CrashCatcher extends React.Component {
  state = { err: null };
  componentDidCatch(err) { this.setState({ err }); }
  render() {
    if (this.state.err) {
      return (
        <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 text-red-800 rounded">
          <b>Edit screen crashed:</b> {String(this.state.err?.message || this.state.err)}
        </div>
      );
    }
    return this.props.children;
  }
}
