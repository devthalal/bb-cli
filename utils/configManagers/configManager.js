const { EventEmitter } = require('stream')
const path = require('path')
const os = require('os')
const { writeFile } = require('fs')
const { readFile } = require('fs/promises')
const { readJsonAsync } = require('..')

class ConfigManager {
  constructor(config, configPath) {
    // eslint-disable-next-line no-bitwise
    this.id = Math.floor(Math.random() * 10 ** 18 + (1 << (Math.random() * 90)))
    this.events = new EventEmitter()
    this.configname = ConfigManager.CONFIG_NAME
    this.liveConfigname = ConfigManager.LIVE_CONFIG_NAME

    this.liveConfigPath = path.join(
      ConfigManager.LIVE_CONFIG_FILE_ROOT_PATH,
      path.resolve(this.directory),
      '.block.live.json'
    )
    this.liveDetails = {
      isOn: false,
      port: null,
      log: {
        out: `./logs/out/${config.meta.name}.log`,
        err: `./logs/err/${config.meta.name}.log`,
      },
    }

    this._writeLiveSignal = null
    this._writeController = new AbortController()
    this._writeSignal = this._writeController.signal

    this.configPath = configPath
    this.config = config
    this.directory = path.basename(configPath)

    this.events.on('write', this._write(this.configPath, this.config))
    this.events.on('writelive', this._writeLiveConfig)
  }

  static CONFIG_NAME = 'block.config.json'

  static LIVE_CONFIG_NAME = '.block.live.json'

  static LIVE_CONFIG_FILE_ROOT_PATH = path.join(os.tmpdir(), 'applocks')

  async init() {
    try {
      const d = await readFile(this.liveConfigPath, 'utf8')
      const dc = JSON.parse(d)
      this.liveDetails = {
        ...dc,
      }
    } catch (err) {
      Promise.resolve()
    }
  }

  _write(configPath, data) {
    if (this.writeLiveSignal && !this.writeLiveSignal.aborted) {
      this.writeController.abort()
    }
    // eslint-disable-next-line no-undef
    this.writeController = new AbortController()
    this.writeLiveSignal = this.writeController.signal
    writeFile(configPath, JSON.stringify(data, null, 2), { encoding: 'utf8', signal: this.writeLiveSignal }, (err) => {
      if (err && err.code !== 'ABORT_ERR') console.log('Error writing live data ', err)
    })
  }

  findMyParentPackage = async (name, myPath, filename) => {
    let parentPackageFound = false
    /**
     * @type {import('./configManager').PackageConfig?}
     */
    let parentPackageConfig
    /**
     * @type {string}
     */
    let currentPath = path.join(this.cwd, this.configname)
    /**
     * @type {string} dir name of parent
     */
    let parent = path.dirname(currentPath)
    // Loop untill path exhaustion or package block type hit
    for (; parent !== currentPath && !parentPackageFound; currentPath = parent, parent = path.dirname(parent)) {
      const { data, err } = await readJsonAsync(path.join(parent, filename))
      if (err) continue
      if (data.type !== 'package') continue
      if (!Object.prototype.hasOwnProperty.call(data.dependencies, name)) continue
      parentPackageFound = true
      parentPackageConfig = { ...data }
    }
    return {
      data: { parent, parentPackageConfig },
      err:
        currentPath === parent ? `Path exhausted! Couldn't find a package block with ${name} in dependencies` : false,
    }
  }

  updateConfig(newConfig) {
    this.config = Object.create(this.config, newConfig)
    return this.config
  }
}
module.exports = ConfigManager
