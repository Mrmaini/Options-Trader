declare module 'yahoo-finance2' {
  const yahooFinance: {
    quote: (symbol: string, options?: any) => Promise<any>;
    options: (symbol: string, options?: any) => Promise<any>;
    historical: (symbol: string, options?: any) => Promise<any>;
    quoteSummary: (symbol: string, options?: any) => Promise<any>;
  };
  export default yahooFinance;
}
