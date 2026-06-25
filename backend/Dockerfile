FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Store Chromium in a fixed path accessible by the app user
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Install Chromium system dependencies manually (playwright install-deps uses Ubuntu
# package names that don't exist on Debian Trixie, so we install them directly)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libxkbcommon0 \
    libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxrandr2 libxrender1 \
    libgbm1 libglib2.0-0 libcairo2 libpango-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxext6 libxi6 libxss1 libxtst6 libexpat1 \
    fonts-liberation fonts-noto-color-emoji fonts-unifont \
    ca-certificates \
    && apt-get install -y --no-install-recommends libasound2t64 2>/dev/null \
    || apt-get install -y --no-install-recommends libasound2 2>/dev/null \
    || true \
    && rm -rf /var/lib/apt/lists/* \
    && playwright install chromium \
    && chmod -R 755 /opt/playwright-browsers

COPY . .

RUN chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
