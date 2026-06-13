import express from 'express';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 33330;

const app = express();

app.get('/', (req, res) => {
    res.json({
        name: 'chirimen-raspi-docker-server',
        status: 'ok',
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
    });
});

app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
});
