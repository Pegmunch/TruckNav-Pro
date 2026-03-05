export const overlayInspector = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[OverlayInspector] ${message}`, data ?? "");
    }
  },
};
