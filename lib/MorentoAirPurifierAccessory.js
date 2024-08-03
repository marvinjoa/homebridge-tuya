const BaseAccessory = require('./BaseAccessory');

class AirPurifierAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.AIR_PURIFIER;
    }

    constructor(...props) {
        super(...props);

        const {Service, Characteristic} = this.hap;

        this.service = this.accessory.getService(Service.AirPurifier)
            || this.accessory.addService(Service.AirPurifier);

        this.service.getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

        this.service.getCharacteristic(Characteristic.CurrentAirPurifierState)
            .on('get', this.getCurrentAirPurifierState.bind(this));

        this.service.getCharacteristic(Characteristic.TargetAirPurifierState)
            .on('get', this.getTargetAirPurifierState.bind(this))
            .on('set', this.setTargetAirPurifierState.bind(this));

        this.service.getCharacteristic(Characteristic.RotationSpeed)
            .on('get', this.getRotationSpeed.bind(this))
            .on('set', this.setRotationSpeed.bind(this));

        this.service.getCharacteristic(Characteristic.FilterLifeLevel)
            .on('get', this.getFilterLifeLevel.bind(this));

        this.service.getCharacteristic(Characteristic.FilterChangeIndication)
            .on('get', this.getFilterChangeIndication.bind(this));
    }

    getActive(callback) {
        this.getState(this.dpActive, (err, dps) => {
            if (err) return callback(err);

            const {Characteristic} = this.hap;
            const isActive = dps[this.dpActive];
            callback(null, isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
        });
    }

    setActive(value, callback) {
        const isActive = value === this.hap.Characteristic.Active.ACTIVE;
        this.setState(this.dpActive, isActive, callback);
    }

    getCurrentAirPurifierState(callback) {
        this.getState(this.dpMode, (err, dps) => {
            if (err) return callback(err);

            const {Characteristic} = this.hap;
            const mode = dps[this.dpMode];

            let state;
            if (mode === 'auto' || mode === 'sleep') {
                state = Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
            } else if (mode.startsWith('F')) {
                state = Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
            } else {
                state = Characteristic.CurrentAirPurifierState.INACTIVE;
            }
            callback(null, state);
        });
    }

    getTargetAirPurifierState(callback) {
        this.getState(this.dpMode, (err, dps) => {
            if (err) return callback(err);

            callback(null, this._getTargetAirPurifierState(dps[this.dpMode]));
        });
    }

    setTargetAirPurifierState(value, callback) {
        const {Characteristic} = this.hap;
        let mode;
        switch (value) {
            case Characteristic.TargetAirPurifierState.MANUAL:
                mode = '1F'; // Default to 1F when switching to manual
                break;
            case Characteristic.TargetAirPurifierState.AUTO:
                mode = 'auto';
                break;
            default:
                this.log.warn('Unhandled setTargetAirPurifierState value: %s', value);
                return callback();
        }
        return this.setState(this.dpMode, mode, callback);
    }

    getRotationSpeed(callback) {
        this.getState([this.dpSwitch, this.dpMode], (err, dps) => {
            if (err) return callback(err);

            callback(null, this._getRotationSpeed(dps));
        });
    }

    setRotationSpeed(value, callback) {
        const {Characteristic} = this.hap;
        if (value === 0) {
            this.setActive(Characteristic.Active.INACTIVE, callback);
        } else {
            let mode;
            if (value <= 25) {
                mode = '1F';
            } else if (value <= 50) {
                mode = '2F';
            } else if (value <= 75) {
                mode = '3F';
            } else {
                mode = '4F';
            }
            return this.setState(this.dpMode, mode, callback);
        }
    }

    getFilterLifeLevel(callback) {
        this.getState(this.dpFilterLife, (err, dps) => {
            if (err) return callback(err);

            callback(null, dps[this.dpFilterLife]);
        });
    }

    getFilterChangeIndication(callback) {
        this.getState(this.dpFilterChange, (err, dps) => {
            if (err) return callback(err);

            const {Characteristic} = this.hap;
            const filterChange = dps[this.dpFilterChange];
            callback(null, filterChange ? Characteristic.FilterChangeIndication.CHANGE_FILTER : Characteristic.FilterChangeIndication.FILTER_OK);
        });
    }

    _getTargetAirPurifierState(dp) {
        const {Characteristic} = this.hap;
        switch (dp) {
            case 'manual':
            case 'Manual':
                return Characteristic.TargetAirPurifierState.MANUAL;
            case 'auto':
            case 'Auto':
                return Characteristic.TargetAirPurifierState.AUTO;
            case 'sleep':
            case 'Sleep':
                return Characteristic.TargetAirPurifierState.AUTO; // Map sleep mode to AUTO for simplicity
            case '1F':
            case '2F':
            case '3F':
            case '4F':
                return Characteristic.TargetAirPurifierState.MANUAL;
            default:
                this.log.warn('Unhandled getTargetAirPurifierState value: %s', dp);
                return Characteristic.TargetAirPurifierState.AUTO;
        }
    }

    _getRotationSpeed(dps) {
        if (!dps[this.dpSwitch]) {
            return 0;
        } else {
            let mode = dps[this.dpMode];
            switch (mode) {
                case 'auto':
                case 'Auto':
                case 'sleep':
                case 'Sleep':
                    return 0; // Auto and sleep modes don't have a specific fan speed
                case '1F':
                    return 25; // Map 1F to 25% fan speed
                case '2F':
                    return 50; // Map 2F to 50% fan speed
                case '3F':
                    return 75; // Map 3F to 75% fan speed
                case '4F':
                    return 100; // Map 4F to 100% fan speed
                default:
                    this.log.warn('Unhandled _getRotationSpeed mode value: %s', mode);
                    return 0;
            }
        }
    }
}

module.exports = AirPurifierAccessory;
