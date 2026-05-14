import { Result } from "antd";
import { useLocation } from "react-router-dom";

export default function ComingSoon() {
  const { pathname } = useLocation();
  const name = pathname.replace("/", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Result
      status="info"
      title={name}
      subTitle="This module is under development. Check back soon."
    />
  );
}
