/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

$(document).ready(() => {
    loadProfile();
});

const getProfile = async () => {
    // get profile using fetch api
    const res = await fetch("http://localhost:3000/api/profile");
    const response = await res.json();
    return response.data;
}

const loadProfile = () => {
    getProfile().then((profile) => {

        // get profile image url from buffer
        const avatarUrl = ImageUtil.getURLfromBuffer(profile.employee.photo);

        // fill profile values to inputs
        $("#number").val(profile.employee.number);
        $("#fullName").val(profile.employee.fullName);
        $("#callingName").val(profile.employee.callingName);
        $("#gender").val(profile.employee.gender.name);
        $("#civilStatus").val(profile.employee.civilStatus.name);
        $("#nic").val(profile.employee.nic);
        $("#address").val(profile.employee.address);
        $("#mobile").val(profile.employee.mobile);
        $("#land").val(profile.employee.land);
        $("#designation").val(profile.employee.designation.name);
        $("#doassignment").val(profile.employee.doassignment);
        $("#description").val(profile.employee.description);
        $("#employeeStatus").val(profile.employee.employeeStatus.name);
        $("#photo").attr("src", avatarUrl);

        // calculate dob
        const dateOfBirth = NIClkUtil.getDOB(profile.employee.nic);

        $("#dobirth").val(dateOfBirth);

        // make form readonly
        $(`#mainForm .form-group`).children().each((i, el) => {
            $(el).attr("readonly", true);
            $(el).attr("disabled", true);
            $(el).addClass("no-outline");
        });
    }
    ).catch((e) => {
        console.log(e);
        showOutputModal("Error", "Something went wrong while reading your profile!.");
    });
}