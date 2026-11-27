/**
 * LABS — safety net for the stats v2 sections.
 *
 * If a v2 section throws while rendering (which would close the app in a
 * release build), the boundary shows `fallback` instead: the current section,
 * or nothing for a section that has no current equivalent. The rest of the
 * screen is untouched.
 */
import { Component } from 'react';

interface Props {
  children: React.ReactNode;
  /** What to show if the children throw. Defaults to nothing. */
  fallback?: React.ReactNode;
}

export class NewStatsBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
