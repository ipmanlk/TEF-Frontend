class FormUtil {
	static validateElementValue(elementValidationInfo) {
		// create selector name for ui element id
		const selector = `#${elementValidationInfo.attribute}`;

		// get value of element id
		const value = $(selector).val();

		// create RegExp object from regex string
		const regex = new RegExp(elementValidationInfo.regex);

		// if value is optional and not set, ignore
		if (
			elementValidationInfo.optional &&
			(value == null || value.trim() == "")
		) {
			$(selector).parent().removeClass("has-error has-success");
			$(selector).parent().children("span").remove();
			return true;
		}

		// check form values with each regex
		if (!regex.test(value)) {
			$(selector).parent().removeClass("has-success");
			$(selector).parent().addClass("has-error");
			$(selector).parent().children("span").remove();
			$(selector)
				.parent()
				.append(
					`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`
				);
			return false;
		} else {
			$(selector).parent().removeClass("has-error");
			$(selector).parent().addClass("has-success");
			$(selector).parent().children("span").remove();
			$(selector)
				.parent()
				.append(
					`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`
				);
			return true;
		}
	}

	static enableRealtimeValidation(validationInfo) {
		// provide freedback when user interact with form elements
		validationInfo.forEach((vi) => {
			$(`#${vi.attribute}`).on("keyup change", () => {
				this.validateElementValue(vi);
			});
		});
	}

	// make an form read only
	static setReadOnly(selector, readOnly) {
		if (readOnly) {
			$(`${selector} .form-group`)
				.children()
				.each((i, el) => {
					if ($(el).data("editable") == true) {
						$(el).attr("readonly", true);
						$(el).attr("disabled", true);
						$(el).addClass("no-outline");
						$(".form-group").removeClass("has-error has-success");
						$(".form-group").children(".form-control-feedback").remove();
					}
				});
		} else {
			$(`${selector} .form-group`)
				.children()
				.each((i, el) => {
					if ($(el).data("editable") == true) {
						$(el).attr("readonly", false);
						$(el).attr("disabled", false);
						$(el).removeClass("no-outline");
					}
				});
		}
	}

	// print a form
	static printForm(formId, title) {
		let table = `<table class="table table-striped">
      <tr><td colspan="2"><h3>${title}</h3></tr>`;
		$(`#${formId} label`).each((i, el) => {
			let type;
			let label, data;

			const firstChild = $(el);
			const secondChild = $(el).next();

			console.log($(secondChild).prop("id"));
			if ($(secondChild).prop("nodeName") == "INPUT") {
				type = "text";
				label = $(firstChild).text();
				data = $(secondChild).val();
			}

			if ($(secondChild).prop("nodeName") == "SELECT") {
				type = "text";
				label = $(firstChild).text();
				data = $(`#${$(secondChild).attr("id")} option:selected`).text();
			}

			if ($(secondChild).prop("nodeName") == "IMG") {
				type = "image";
				label = $(firstChild).text();
				data = `<img src="${$(secondChild).attr("src")}" width="100px"></img>`;
			}

			if (!type) return;

			table += `<tr>
                      <td style="width:30%">${label.replace("*", "")}</td>
                      <td>${data}</td>
                  <tr>`;
		});

		table += "</table>";

		// create new window and print the table
		const stylesheet =
			"http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
		const win = window.open("", "Print", "width=1000,height=600");
		win.document.write(
			`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${table}</body></html>`
		);
		setTimeout(() => {
			win.document.close();
			win.print();
			win.close();
		}, 500);
	}

	// select an option in a dropdown using value
	static selectDropdownOptionByValue(dropdownId, optionValue) {
		$(`#${dropdownId}`)
			.children("option")
			.each(function () {
				$(this).removeAttr("selected");

				// get the value of current option element
				const currentValue = $(this).attr("value");

				// check if current value is equal to given value
				if (currentValue == optionValue) {
					$(this).attr("selected", "selected");
				}
			});
	}

	// select an option in a dropdown using text
	static selectDropdownOptionByText(dropdownId, optionText) {
		$(`#${dropdownId}`)
			.children("option")
			.each(function () {
				$(this).removeAttr("selected");

				// get the text of current option element
				const currentText = $(this).text();

				// check if current text is equal to given text
				if (currentText == optionText) {
					$(this).attr("selected", "selected");
				}
			});
	}

	// show hide approrpiate buttons
	static setButtionsVisibility(formId, permission = [], action) {
		switch (action) {
			case "view":
				$(`#${formId} .btnFmAdd`).hide();
				$(`#${formId} .btnFmUpdate`).hide();
				$(`#${formId} .btnFmDelete`).hide();
				$(`#${formId} .btnFmReset`).hide();
				$(`#${formId} .btnFmPrint`).show();
				break;

			case "edit":
				$(`#${formId} .btnFmAdd`).hide();
				$(`#${formId} .btnFmPrint`).hide();
				if (permission[2] !== 0) $(`#${formId} .btnFmUpdate`).show();
				if (permission[3] !== 0) $(`#${formId} .btnFmDelete`).show();
				$(`#${formId} .btnFmReset`).show();
				break;

			case "add":
				$(`#${formId} .btnFmUpdate`).hide();
				$(`#${formId} .btnFmDelete`).hide();
				$(`#${formId} .btnFmPrint`).hide();
				$(`#${formId} .btnFmReset`).show();
				if (permission[0] !== 0) $(`#${formId} .btnFmAdd`).show();
				break;
		}
	}

	static enableReadOnly(formId) {
		$(`#${formId} .form-group`).addClass("read-only");
	}

	static disableReadOnly(formId) {
		$(`#${formId} .form-group`).removeClass("read-only");
	}
}
