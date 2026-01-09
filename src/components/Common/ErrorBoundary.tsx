import React from 'react';

type Props = {
	children: React.ReactNode;
	fallback?: React.ReactNode;
};

type State = {
	hasError: boolean;
	error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// eslint-disable-next-line no-console
		console.error('[ErrorBoundary] Caught error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback ?? (
				<div className="p-3 text-sm text-red-300">
					Something went wrong rendering this panel.
				</div>
			);
		}
		return this.props.children;
	}
}




