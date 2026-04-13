"use client";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 30_000;

export function usePollingRefresh(
  onRefresh: () => void,
  isBusy: boolean
) {
  const [hasPending, setHasPending] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const isBusyRef   = useRef(isBusy);

  onRefreshRef.current = onRefresh;
  isBusyRef.current    = isBusy;

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isBusyRef.current) {
        // Pas occupé → refresh silencieux immédiat
        onRefreshRef.current();
        setHasPending(false);
      } else {
        // Occupé → signale qu'un refresh est en attente
        setHasPending(true);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  // Dès que l'utilisateur n'est plus occupé et qu'un refresh est en attente → applique-le
  useEffect(() => {
    if (!isBusy && hasPending) {
      setHasPending(false);
      onRefreshRef.current();
    }
  }, [isBusy, hasPending]);

  function confirmRefresh() {
    setHasPending(false);
    onRefreshRef.current();
  }

  return { hasPending, confirmRefresh };
}
