import Dashboard from "~/pages/Dashboard";
import ListIP from "~/pages/ListIP";

const publicRoutes = [
  { path: "/", component: Dashboard },
  { path: "/listip", component: ListIP },
];

const privateRoutes = [];

export { publicRoutes, privateRoutes };
