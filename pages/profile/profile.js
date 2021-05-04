/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/
const tempData = { passwordRegex: null, profile: null };

$(document).ready(() => {
	loadProfile();
	registerEventListeners().catch((e) => {
		console.log(e);
	});
});

const registerEventListeners = async () => {
	// disable form submit
	$("form").on("submit", (e) => {
		e.preventDefault();
	});

	// get regex
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "USER" },
	});

	// needed regex
	let passwordRegexObj = response.data.find((vi) => vi.attribute == "password");
	const passwordRegex = new RegExp(passwordRegexObj.regex);
	tempData.passwordRegex = passwordRegex;

	// event listeners for password inputs
	$("#password,#passwordConfirm").on("keyup", function () {
		const password = $("#password").val();
		const passwordConfirm = $("#passwordConfirm").val();

		if (password !== passwordConfirm || !passwordRegex.test(password)) {
			$("#password").parent().removeClass("has-success");
			$("#passwordConfirm").parent().removeClass("has-success");
			$("#password").parent().addClass("has-error");
			$("#passwordConfirm").parent().addClass("has-error");
		} else {
			$("#password").parent().removeClass("has-error");
			$("#passwordConfirm").parent().removeClass("has-error");
			$("#password").parent().addClass("has-success");
			$("#passwordConfirm").parent().addClass("has-success");
		}
	});

	$("#btnChangePassword").on("click", changePassword);
};

const changePassword = async () => {
	// check if password is valid
	const oldPassword = $("#oldPassword").val();
	const password = $("#password").val();

	if (
		!tempData.passwordRegex.test(oldPassword) ||
		!tempData.passwordRegex.test(password)
	) {
		mainWindow.showOutputModal("Error", "Please provide valid password!");
		return;
	}

	// send put reqeust to update data
	const response = await Request.send("/api/profile/password", "PUT", {
		data: {
			id: tempData.profile.id,
			oldPassword: oldPassword,
			password: password,
		},
	});

	// show output modal based on response
	if (response.status) {
		mainWindow.showOutputToast("Success!", response.msg);
		$("#formChangePassword").trigger("reset");
		$(".form-group").removeClass("has-error");
		$(".form-group").removeClass("has-success");
	}
};

const getProfile = async () => {
	// get profile using fetch api
	const res = await fetch("http://localhost:3000/api/profile");
	const response = await res.json();
	return response.data;
};

const loadProfile = () => {
	getProfile()
		.then((profile) => {
			// save globally
			tempData.profile = profile;

			// get profile image url from buffer
			const avatarUrl = MiscUtil.getURLfromBuffer(profile.employee.photo);

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
			$("#doassignment").val(
				new Date(profile.employee.doassignment).formatForInput()
			);
			$("#description").val(profile.employee.description);
			$("#employeeStatus").val(profile.employee.employeeStatus.name);
			$("#photo").attr("src", avatarUrl);

			// calculate dob
			const dateOfBirth = NIClkUtil.getDOB(profile.employee.nic);

			$("#dobirth").val(dateOfBirth);

			// make form readonly
			$(`#mainForm .form-group`)
				.children()
				.each((i, el) => {
					$(el).attr("readonly", true);
					$(el).attr("disabled", true);
					$(el).addClass("no-outline");
				});

			$("#mainForm input,textarea").each(function (i, el) {
				const elementValue = $(el).val();
				if (elementValue.trim() == "") $(el).val("Not Provided.");
			});
		})
		.catch((e) => {
			console.log(e);
			mainWindow.showOutputModal(
				"Error",
				"Something went wrong while reading your profile!."
			);
		});
};
