module.exports = {
  apps: [
    {
      name: "track-api",
      cwd: "/var/www/track.diabal.ru/server",
      script: "index.js",
      env: {
        TRACK_PORT: 3010,
        TRACK_PIN: "111",
        TRACK_DATA_DIR: "/var/lib/track",
      },
    },
  ],
};
