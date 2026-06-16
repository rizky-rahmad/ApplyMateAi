/** An error whose message is safe to show the user, carrying an HTTP status. */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

/** Normalize any thrown value into a { status, message } pair for an API response. */
export function toErrorResponse(err: unknown): { status: number; message: string } {
  if (err instanceof AppError) return { status: err.status, message: err.message };
  if (err instanceof Error) {
    // Don't leak internals for unexpected errors.
    console.error(err);
    return { status: 500, message: "Something went wrong. Please try again." };
  }
  console.error("Unknown error", err);
  return { status: 500, message: "Something went wrong. Please try again." };
}
