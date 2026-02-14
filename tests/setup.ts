// Configure MongoDB Memory Server to use version 7.0.3 for Debian 12 compatibility
// These environment variables must be set before MongoDB Memory Server is imported
process.env.MONGOMS_VERSION = '7.0.3';
process.env.MONGOMS_ARCH = 'x64';
process.env.MONGOMS_PLATFORM = 'linux';
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '120000';

