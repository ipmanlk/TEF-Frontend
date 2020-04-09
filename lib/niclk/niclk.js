class NIClkUtil {
    static getInfo(nic) {
        return {
            "dob": this.getDOB(nic),
            "type": this.getType(nic),
            "gender": this.getGender(nic)
        }
    }

    static getDOB(nic) {
        if (!this.validate(nic)) return false;

        const type = this.getType(nic);
        let days = (type === "new") ? parseInt(nic.slice(4, 7)) : parseInt(nic.slice(2, 5));

        const gender = this.getGender(nic);

        // fix days to calculate date of birth
        days = (gender == "female") ? days - 500 : days;

        // get year in YYYY format
        let year;
        if (type == "old") {
            const yy = nic.slice(0, 2);
            year = (yy < 17) ? "20" + yy : "19" + yy;
        } else {
            year = nic.slice(0, 4);
        }

        // sum of months for leap years and normal years
        const sumOfMonths = ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0) ? [31, 61, 92, 122, 153, 183, 214, 245, 275, 306, 336, 366] : [31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 365]
            

        // calculate birth month & day using sum of months
        let index = 0, month, day;

        if (days <= sumOfMonths[0]) {
            month = 1;
            day = days;
        } else {
            for (let sumOfDays of sumOfMonths) {
                index++;
                if (days <= sumOfDays) {
                    month = index;
                    day = days - sumOfMonths[index - 2];
                    break;
                }
            }
        }

        // format day and month to DD & MM format accordingly
        month = (month.toString().length == 1) ? `0${month}` : month;
        day = (day.toString().length == 1) ? `0${day}` : day;

        return `${year}-${month}-${day}`;
    }

    static getGender(nic) {
        if (!this.validate(nic)) return false;
        const days = (this.getType(nic) === "new") ? parseInt(nic.slice(4, 7)) : parseInt(nic.slice(2, 5));
        return (days > 500) ? "female" : "male"
    }

    static getType(nic) {
        if (!this.validate(nic)) return false;
        return ((nic.length === 10) ? "old" : "new");
    }

    static validate(nic) {
        return /^([\d]{9}(\V|\X))|([\d]{12})$/.test(nic);
    }
}