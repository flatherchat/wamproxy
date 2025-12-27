{
  "$schema": "https://unpkg.com/@cloudflare/workers-types@4.20231218.0/worker-configuration.d.ts",
  "bindings": [
    {
      "type": "plain_text",
      "name": "ALLOWED_DOMAINS",
      "text": "*"
    },
    {
      "type": "plain_text",
      "name": "MAX_FILE_SIZE_MB",
      "text": "100"
    }
  ]
}
