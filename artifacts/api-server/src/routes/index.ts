import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import camerasRouter from "./cameras";
import eventsRouter from "./events";
import dashboardRouter from "./dashboard";
import zonesRouter from "./zones";
import notificationsRouter from "./notifications";
import edgeAgentsRouter from "./edge-agents";
import usersRouter from "./users";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(camerasRouter);
router.use(eventsRouter);
router.use(dashboardRouter);
router.use(zonesRouter);
router.use(notificationsRouter);
router.use(edgeAgentsRouter);
router.use(usersRouter);
router.use(webhooksRouter);

export default router;
