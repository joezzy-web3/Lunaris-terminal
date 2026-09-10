import { useEffect, useState } from 'react';

export function useBitgetFeed(symbols = ['BTCUSDT', 'ETHUSDT']) {
  const [tickers, setTickers] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchInitialPrices = async () => {
      try {
        const response = await fetch('https://api.bitget.com/api/v2/spot/market/tickers');
        const json = await response.json();
        if (json.code === '00000' && Array.isArray(json.data)) {
          const initialMap = {};
          json.data.forEach((item) => {
            if (symbols.includes(item.symbol)) {
              initialMap[item.symbol] = {
                price: parseFloat(item.lastPr),
                change24h: parseFloat(item.change24h),
                high24h: parseFloat(item.high24h),
                low24h: parseFloat(item.low24h),
              };
            }
          });
          setTickers(initialMap);
        }
      } catch (err) {
        console.error('Failed to fetch initial Bitget tickers:', err);
      }
    };

    fetchInitialPrices();

    const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public');

    ws.onopen = () => {
      setIsConnected(true);
      const subscribeArgs = symbols.map((symbol) => ({
        instType: 'SPOT',
        channel: 'ticker',
        instId: symbol,
      }));

      ws.send(
        JSON.stringify({
          op: 'subscribe',
          args: subscribeArgs,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.action === 'snapshot' || message.action === 'update') {
          const data = message.data?.[0];
          if (data && data.instId) {
            setTickers((prev) => ({
              ...prev,
              [data.instId]: {
                price: parseFloat(data.lastPr),
                change24h: parseFloat(data.change24h),
                high24h: parseFloat(data.high24h),
                low24h: parseFloat(data.low24h),
              },
            }));
          }
        }
      } catch (err) {
        console.error('Error processing Bitget WebSocket message:', err);
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = (err) => console.error('Bitget WebSocket Error:', err);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [JSON.stringify(symbols)]);

  return { tickers, isConnected };
}
