import { httpRouter } from "convex/server";
import { auth } from "./authConfig";

const http = httpRouter();

// Convex Authのルートを追加
auth.addHttpRoutes(http);

export default http; 