import { useState, useEffect } from "react";

interface IProps {
  count: number;
  onTimeup: () => void;
}
const Timer = ({ count, onTimeup }: IProps) => {
  const [seconds, setSeconds] = useState(count);

  useEffect(() => {
    if (seconds <= 0) return;

    const timerId = setInterval(() => {
      setSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [seconds]);

  useEffect(() => {
    if (seconds === 0) {
      onTimeup();
    }
  }, [seconds, onTimeup]);

  return <span>{seconds}</span>;
};

export default Timer;
