# Envia development environment

Local development uses `.env.development.local`, which Next.js loads for `npm run dev` with higher priority than `.env` and `.env.local`. The local file is ignored by Git and points to Envia's test API. Configure the Envia sandbox key and shipping origin in that file:

```env
ENVIA_API_URL=https://ship-test.envia.com
ENVIA_API_KEY=your-sandbox-key
ENVIA_SHIPPING_CARRIERS=fedex
ENVIA_ORIGIN_NAME=Dingerbites
ENVIA_ORIGIN_COMPANY=Dingerbites
ENVIA_ORIGIN_STREET=Your warehouse street
ENVIA_ORIGIN_NUMBER=123
ENVIA_ORIGIN_DISTRICT=Your neighborhood
ENVIA_ORIGIN_CITY=Monterrey
ENVIA_ORIGIN_STATE=Nuevo Leon
ENVIA_ORIGIN_POSTAL_CODE=00000
ENVIA_ORIGIN_COUNTRY=MX
ENVIA_ORIGIN_PHONE=
```

The development environment is preconfigured with the shipping origin provided for Dingerbites and FedEx as a carrier enabled for the account. Envia's rate endpoint requires one request per carrier, so list the carriers enabled in your Envia account in `ENVIA_SHIPPING_CARRIERS`, separated by commas (for example `fedex,dhl,estafeta`). Do not copy a production API key into the local file. Restart the dev server after changing environment variables.

The checkout requests a real Envia quote after the destination address is complete and lists the available carrier services for selection. Customers can sort by price or delivery speed and filter by carrier. Before payment, the server re-quotes and validates the selected carrier service; if Envia cannot return it, checkout does not proceed with a guessed flat rate.

Envia's rating API accepts package measurements but does not provide a standard box-size catalog for checkout. Products use an estimated shipping size: TCG envelope (19 × 22 × 2 cm, 1 kg), small (20 × 15 × 10 cm, 1 kg), medium (30 × 20 × 15 cm, 3 kg), or large (40 × 30 × 20 cm, 5 kg). These are initial estimates and should be adjusted to the packaging actually used. A cart quote uses the largest product size and the declared item weights when all are available; otherwise it uses the selected size's estimated weight.

The order note and product suggestions are collected in the cart, before checkout. The optional `tamano_envio` column in the general CSV product upload accepts `envelope`, `small`, `medium`, or `large`; TCG imports default to the envelope.

For production, configure the same origin and carrier fields and a production `ENVIA_API_KEY` in the deployment environment, set `ENVIA_SHIPPING_CARRIERS` to the carriers enabled for the production account, and set `ENVIA_API_URL=https://api.envia.com`. These values are not copied from the local development file.
