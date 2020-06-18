class NIClkUtil {

    static getDOB(nic) { 

        // convert new nic numbers to standard format
        if (nic.length == 10) {
            nic = "19" + nic.substring(0, 5) + "0" + nic.substring(5, 9);
        }
    
        // get birth year
        const year = nic.substring(0, 4);

        // get no of days in nic
        const noOfDays = nic.substring(4, 7);
    
        // create a new date for the birth year
        const date = new Date(year);
        
        let dob = "";

        // build dob string based on the year
        if (year % 4 != 0) {
            if (noOfDays <= 59) {
                date.setDate(parseInt(noOfDays));
                dob = year + "-" + getMonthDate(date);
            } else if (noOfDays == 60) {
                dob = year + "-" + "02" + "-" + "29";
            } else {
                date.setDate(parseInt(noOfDays) - 1);
                dob = year + "-" + getMonthDate(date);
            }
        } else {
            date.setDate(parseInt(noOfDays));
            dob = year + "-" + getMonthDate(date);
        }
    
        function getMonthDate(monthdate) {
            var month = monthdate.getMonth() + 1;
            var date = monthdate.getDate();
            if (month < 10) month = "0" + month;
            if (date < 10) date = "0" + date;
        
            return month + "-" + date;
        }

        return dob;
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