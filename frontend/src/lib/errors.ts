interface AxiosLikeError {
  response?: { status?: number };
  code?: string;
  message?: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to access this feature.",
  404: "This feature is currently unavailable.",
  409: "A conflict occurred. Please refresh and try again.",
  422: "The submitted data is invalid. Please review your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again shortly.",
  502: "The server is temporarily unavailable. Please try again.",
  503: "The service is currently under maintenance. Please try again later.",
  504: "The request timed out on the server. Please try again.",
};

export function getApiErrorMessage(error: unknown): string {
  const e = error as AxiosLikeError;

  if (!e) return "An unexpected error occurred.";

  if (e.code === "ECONNABORTED" || e.message?.toLowerCase().includes("timeout")) {
    return "The request timed out. Please check your connection and try again.";
  }

  if (!e.response) {
    return "Unable to connect. Please check your internet connection.";
  }

  const status = e.response.status;
  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (status && status >= 500) {
    return "Something went wrong on our end. Please try again shortly.";
  }

  if (status && status >= 400) {
    return "An error occurred. Please try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
