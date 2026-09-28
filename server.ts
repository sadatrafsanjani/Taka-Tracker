import { APP_BASE_HREF } from '@angular/common';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse
} from '@angular/ssr/node';
import express from 'express';

const app = express();

const angularApp = new AngularNodeAppEngine();

app.use(
  express.static('browser', {
    maxAge: '1y',
    index: false,
    redirect: false
  })
);

app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req, {
      providers: [
        {
          provide: APP_BASE_HREF,
          useValue: req.baseUrl
        }
      ]
    });

    if (response) {
      await writeResponseToNodeResponse(response, res);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT']) || 4000;

  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
