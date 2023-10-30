$.validator.addMethod(
  "customEmail",
  function (value, element) {
    let pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(value);
  },
  "Please enter a valid email address."
);

$.validator.addMethod(
  "maxFiles",
  function (value, element, param) {
    return element.files.length <= param;
  },
  $.validator.format("You can only upload a maximum of {0} files.")
);

$.validator.addMethod(
  "noSpaceMinLength",
  function (value, element, param) {
    return value.replace(/\s+/g, "").length >= param;
  },
  $.validator.format("Enter at least {0} characters, spaces not included.")
);

$.validator.addMethod(
  "noSpaceStartEnd",
  function (value, element) {
    return this.optional(element) || !/^\s|\s$/.test(value);
  },
  "Leading and trailing spaces are not allowed."
);

$.validator.addMethod(
  "noSpaces",
  function (value, element) {
    return value.indexOf(" ") < 0;
  },
  "Spaces are not allowed."
);

$.validator.addMethod(
  "between0And30",
  function (value, element) {
    return value >= 0 && value <= 30;
  },
  "Please enter a value between 0 and 30."
);

$.validator.addMethod(
  "integer",
  function (value, element) {
    return this.optional(element) || /^\d+$/.test(value);
  },
  "Please enter a non-negative integer value."
);

$.validator.addMethod(
  "allCaps",
  function (value, element) {
    return value === value.toUpperCase();
  },
  "Coupon code must be in uppercase."
);

$.validator.addMethod(
  "endDateAfterStartDate",
  function (value, element, params) {
    const startDate = new Date($(params).val());
    const endDate = new Date(value);
    return endDate >= startDate;
  },
  "End date should be greater than or equal to start date."
);

function showAlert(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert";
  alertDiv.style.position = "fixed";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "2000";
  alertDiv.style.top = "60px";
  alertDiv.style.opacity = "0";
  alertDiv.style.transition = "opacity 0.5s ease-in-out";
  alertDiv.style.backgroundColor = "#7F1734"; // Red
  alertDiv.style.color = "white";
  alertDiv.style.padding = "15px";
  alertDiv.style.marginBottom = "15px";
  alertDiv.style.borderRadius = "4px";
  alertDiv.style.boxShadow =
    "0 2px 15px 0 rgba(0,0,0,0.24), 0 5px 5px 0 rgba(0,0,0,0.19)";
  alertDiv.setAttribute("role", "alert");
  alertDiv.innerHTML = `<strong>${message}</strong>`;
  document.body.appendChild(alertDiv);

  // Fade in
  setTimeout(() => {
    alertDiv.style.opacity = "1";
  }, 50);

  // Fade out and remove
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 2000);
}

function showSuccess(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert";
  alertDiv.style.position = "fixed";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "2000";
  alertDiv.style.top = "60px";
  alertDiv.style.opacity = "0";
  alertDiv.style.transition = "opacity 0.5s ease-in-out";
  alertDiv.style.backgroundColor = "#088178"; // Green
  alertDiv.style.color = "white";
  alertDiv.style.padding = "15px";
  alertDiv.style.marginBottom = "15px";
  alertDiv.style.borderRadius = "4px";
  alertDiv.style.boxShadow =
    "0 2px 15px 0 rgba(0,0,0,0.24), 0 5px 5px 0 rgba(0,0,0,0.19)";
  alertDiv.setAttribute("role", "alert");
  alertDiv.innerHTML = `<strong>${message}</strong>`;
  document.body.appendChild(alertDiv);

  // Fade in
  setTimeout(() => {
    alertDiv.style.opacity = "1";
  }, 50);

  // Fade out and remove
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 2000);
}

function navigateWithDropDown(selectElement) {
  const selectedURL = selectElement.value;
  if (selectedURL) {
    window.location.href = selectedURL;
  }
}

$(function () {
  if (typeof successMessage !== "undefined") {
    showSuccess(successMessage);
    successMessage = undefined;
  }
  if (typeof errorMessage !== "undefined") {
    showAlert(errorMessage);
    errorMessage = undefined;
  }

  $(".banner-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      sub_heading: {
        noSpaceMinLength: 4,
        maxlength: 20,
      },
      main_heading: {
        noSpaceMinLength: 6,
        maxlength: 18,
      },
      highlighted_heading: {
        noSpaceMinLength: 6,
        maxlength: 15,
      },
      small_description: {
        noSpaceMinLength: 4,
        maxlength: 40,
      },
    },
    errorPlacement: function (error, element) {
      element.next(".error-span").html(error.text());
    },
  });

  $(".coupon-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      coupon_code: {
        required: true,
        minlength: 4,
        noSpaces: true,
        allCaps: true,
        maxlength: 8,
      },
      discount_percentage: {
        required: true,
        number: true,
        between0And30: true,
      },
    },
    messages: {
      coupon_code: {
        required: "Please enter the coupon code.",
        minlength: "Coupon code must have at least {0} characters.",
        maxlength: "Coupon code cannot exceed {0} characters.",
        noSpaces: "Spaces are not allowed in coupon code.",
        allCaps: "Coupon code must be in uppercase.",
      },
      discount_percentage: {
        required: "Please enter the discount percentage.",
        number: "Please enter a valid number.",
        between0And30: "Please enter a value between 0 and 30.",
      },
    },
    submitHandler: function (form) {
      const couponCodeInput = $("#coupon_code");
      const couponCode = couponCodeInput.val();

      $.get(`/admin/coupon/check-coupon/${couponCode}`)
        .done(function (response) {
          if (response.exists) {
            $("#coupon_code")
              .next(".error-span")
              .text("Coupon code already exists");
            couponCodeInput.focus();
          } else {
            $("#coupon_code").next(".error-span").text("");
            form.submit();
          }
        })
        .fail(function (error) {
          showAlert("error", "Error checking coupon, try again later!");
          console.error("Error checking coupon:", error);
        });
    },
  });

  $(".admin-edit-order-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      order_name: {
        required: true,
        noSpaceStartEnd: true,
        noSpaceMinLength: 2,
      },
      order_email: {
        required: true,
        customEmail: true,
        noSpaceStartEnd: true,
      },
      delivery_date: {
        required: true,
        date: true,
      },
      status: {
        required: true,
      },
    },
    messages: {
      order_name: {
        required: "Please enter the user name.",
        noSpaceMinLength: "User name must have at least 2 characters.",
      },
      order_email: {
        required: "Please enter the user email.",
        customEmail: "Please enter a valid email address.",
      },
      delivery_date: {
        required: "Please select a delivery date.",
      },
      status: {
        required: "Please select a status.",
      },
    },
    submitHandler: function (form) {
      form.submit();
    },
  });
  $(".stock-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      stock_no: {
        required: true,
        min: 1,
        number: true,
        step: 1,
      },
    },
    messages: {
      stock_no: {
        required: "This field is required.",
        min: "Please enter a value greater than 0.",
        number: "Please enter a valid number.",
        step: "Only integers are allowed, no floating points.",
      },
    },
  });
  $(".edit-product-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      product_name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 100,
      },
      product_color: {
        required: true,
        noSpaceStartEnd: true,
      },
      product_brand: {
        required: true,
      },
      price: {
        required: true,
        min: 0,
        digits: true,
      },
      stock: {
        required: true,
        min: 0,
        digits: true,
      },
      description: {
        required: true,
        noSpaceStartEnd: true,
      },
      product_category: {
        required: true,
      },
      product_sizes: {
        required: true,
      },
      discount_percentage: {
        integer: true,
        between0And30: true,
      },
    },
    messages: {
      product_name: {
        required: "Please enter a product name",
      },
      product_color: {
        required: "Please enter a color",
      },
    },
    errorPlacement: function (error, element) {
      if (
        element.attr("type") === "checkbox" ||
        element.attr("type") === "radio"
      ) {
        error.appendTo(element.parent().parent());
      } else {
        error.insertAfter(element);
      }
    },
  });
  $(".add-product-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      product_name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 100,
      },
      product_color: {
        required: true,
        noSpaceStartEnd: true,
      },
      product_brand: {
        required: true,
      },
      price: {
        required: true,
        min: 0,
        digits: true,
      },
      stock: {
        required: true,
        min: 0,
        digits: true,
      },
      description: {
        required: true,
        noSpaceStartEnd: true,
      },
      mainImage: {
        required: true,
        maxFiles: 3,
      },
      image: {
        required: true,
        maxFiles: 3,
      },
      product_category: {
        required: true,
      },
      product_sizes: {
        required: true,
      },
      discount_percentage: {
        integer: true,
        between0And30: true,
      },
    },
    messages: {
      product_name: {
        required: "Please enter a product name",
      },
      product_color: {
        required: "Please enter a color",
      },
    },
    errorPlacement: function (error, element) {
      if (
        element.attr("type") === "checkbox" ||
        element.attr("type") === "radio"
      ) {
        error.appendTo(element.parent().parent());
      } else {
        error.insertAfter(element);
      }
    },
  });

  $(".signup-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 20,
      },
      email: {
        required: true,
        customEmail: true,
        maxlength: 50,
      },
      password: {
        required: true,
        noSpaceMinLength: 4,
      },
      confirmPassword: {
        required: true,
        noSpaceMinLength: 4,
      },
    },
    highlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .addClass(errorClass)
        .removeClass(validClass);
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .removeClass(errorClass)
        .addClass(validClass);
      $(element).closest(".wrap-input100").removeAttr("data-error");
    },
    errorPlacement: function (error, element) {
      let errorSpan = element.next(".error-span");
      if (errorSpan.length) {
        error.appendTo(errorSpan);
      } else {
        error.insertAfter(element);
      }
    },
  });

  $("#referralCode").on("keyup", function (event) {
    let code = $(this).val();
    console.log("Code:", code);

    if (!code.trim()) {
      console.log("Empty code detected");
      $(".referral-check-msg").hide();
      $(".referral-input-msg").show();
      return;
    }

    $.ajax({
      type: "POST",
      url: "/check-referral",
      data: { referralCode: code },
      success: function (response) {
        console.log("Response:", response);
        if (response.valid) {
          $(".referral-check-msg")
            .text("Correct Referral Code")
            .css("color", "#198754")
            .show();
          $(".referral-input-msg").hide();
        } else {
          console.log("not valid");
          $(".referral-check-msg")
            .text("Incorrect Referral Code")
            .css("color", "#c51e3a")
            .show();
          $(".referral-input-msg").hide();
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log("Error:", textStatus, errorThrown);
      },
    });
  });

  $(".login-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      email: {
        required: true,
        customEmail: true,
        noSpaceStartEnd: true,
        maxlength: 50,
      },
      password: {
        required: true,
        noSpaceMinLength: 4,
      },
    },
    highlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .addClass(errorClass)
        .removeClass(validClass);
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .removeClass(errorClass)
        .addClass(validClass);
      $(element).closest(".wrap-input100").removeAttr("data-error");
    },
    errorPlacement: function (error, element) {
      let errorSpan = element.next(".error-span");
      if (errorSpan.length) {
        error.appendTo(errorSpan);
      } else {
        error.insertAfter(element);
      }
    },
  });
  $(".admin-login-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      userName: {
        required: true,
        noSpaceStartEnd: true,
        maxlength: 20,
      },
      password: {
        required: true,
        noSpaceMinLength: 4,
      },
    },
    highlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .addClass(errorClass)
        .removeClass(validClass);
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element)
        .closest(".wrap-input100")
        .removeClass(errorClass)
        .addClass(validClass);
      $(element).closest(".wrap-input100").removeAttr("data-error");
    },
    errorPlacement: function (error, element) {
      let errorSpan = element.next(".error-span");
      if (errorSpan.length) {
        error.appendTo(errorSpan);
      } else {
        error.insertAfter(element);
      }
    },
  });

  $(".category-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      category_name: {
        required: true,
        noSpaceStartEnd: true,
        noSpaceMinLength: 3,
        maxlength: 15,
      },
      discount_percentage: {
        integer: true,
        between0And30: true,
      },
      category_img: {
        required: true,
      },
    },
    messages: {
      category_name: {
        required: "Please enter a category name",
      },
    },
    submitHandler: function (form) {
      const categoryNameInput = $("#category_name");
      const categoryName = categoryNameInput.val();
      const editCategoryName = $("#hidden_input_category_name").val();

      $.get("/admin/check-category", {
        categoryName: categoryName,
        editCategoryName: editCategoryName,
      })
        .done(function (response) {
          console.log("check category response");
          if (response.exists) {
            console.log("category name exists");
            $(".error-span").text("Category name already exists");
            categoryNameInput.focus();
          } else {
            console.log("category name didn't exists");
            $(".error-span").text("");
            form.submit();
          }
        })
        .fail(function (error) {
          console.error("Error checking category:", error);
        });
    },
  });

  $(".email-login-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      email: {
        required: true,
        customEmail: true,
      },
    },
    errorPlacement: function (error, element) {
      let errorSpan = element.next(".error-span");
      if (errorSpan.length) {
        error.appendTo(errorSpan);
      }
    },
  });

  $(".brand-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      brand_name: {
        required: true,
        noSpaceStartEnd: true,
        noSpaceMinLength: 3,
        maxlength: 15,
      },
    },
    messages: {
      brand_name: {
        required: "Please enter a brand name",
      },
    },
    errorPlacement: function (error, element) {
      if (element.next(".error-span").length) {
        error.appendTo(element.next(".error-span"));
      }
    },
    submitHandler: function (form) {
      const brandNameInput = $("#brand_name");
      const brandName = brandNameInput.val();

      $.get(`/admin/check-brand/${brandName}`)
        .done(function (response) {
          if (response.exists) {
            $(".error-span").text("Brand name already exists");
            brandNameInput.focus();
          } else {
            $(".error-span").text("");
            form.submit();
          }
        })
        .fail(function (error) {
          console.error("Error checking brand:", error);
        });
    },
  });

  $(".sales-report-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      startDate: {
        required: true,
      },
      endDate: {
        required: true,
        endDateAfterStartDate: "#startDate",
      },
    },
    messages: {
      startDate: {
        required: "Please select a start date.",
      },
      endDate: {
        required: "Please select an end date.",
      },
    },
    submitHandler: function (form) {
      form.submit();
    },
  });

  $("#brand_name").on("input", function () {
    const brandName = $(this).val();

    if (brandName.trim()) {
      $.get(`/admin/check-brand/${brandName}`)
        .done(function (response) {
          if (response.exists) {
            $(".error-span").text("Brand name already exists");
          } else {
            $(".error-span").text("");
          }
        })
        .fail(function (error) {
          console.error("Error checking brand:", error);
        });
    } else {
      $(".error-span").text("");
    }
  });

  $("#coupon_code").on("input", function () {
    const brandName = $(this).val();

    if (brandName.trim()) {
      $.get(`/admin/check-brand/${brandName}`)
        .done(function (response) {
          if (response.exists) {
            $(".error-span").text("Brand name already exists");
          } else {
            $(".error-span").text("");
          }
        })
        .fail(function (error) {
          console.error("Error checking brand:", error);
        });
    } else {
      $(".error-span").text("");
    }
  });

  $("#coupon_code").on("input", function () {
    const couponCode = $(this).val();

    if (couponCode.trim()) {
      const newCouponCodeInput = $("#coupon_code");
      const newCouponCode = newCouponCodeInput.val();
      const oldCouponCode = $("#hidden_input_coupon_code").val();

      $.get("/admin/coupon/check-coupon", {
        newCouponCode: newCouponCode,
        oldCouponCode: oldCouponCode,
      })
        .done(function (response) {
          if (response.exists) {
            $("#coupon_code")
              .next(".error-span")
              .text("Coupon name already exists");
          } else {
            $("#coupon_code").next(".error-span").text("");
          }
        })
        .fail(function (error) {
          showAlert("error", "Error checking coupon, try again later!");
          console.error("Error checking coupon:", error);
        });
    } else {
      $(".error-span").text("");
    }
  });

  $(".dropdown-menu a.dropdown-item").click(function () {
    console.log("on filter change");
    let filterValue = $(this).data("value");
    if (filterValue === "allTime") {
      updateChart(xValues, yValues, "All Time Order Status");
    } else if (filterValue === "paymentMethod") {
      let labels = paymentMethodCounts.map((e) => e._id);
      let counts = paymentMethodCounts.map((e) => e.count);
      updateChart(labels, counts, "Order Counts By Payment Method");
    } else if (filterValue.startsWith("year_")) {
      let year = parseInt(filterValue.split("_")[1]);
      let monthlyCounts = Array(12).fill(0);
      let labels = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      yearData
        .filter((data) => data._id.year === year)
        .forEach((data) => {
          monthlyCounts[data._id.month - 1] = data.count;
        });
      updateChart(labels, monthlyCounts, `Orders In ${year}`);
    } else if (filterValue.startsWith("month_")) {
      console.log("on month filter");
      let month = parseInt(filterValue.split("_")[1]) + 1;
      let labels = [
        "Processing",
        "Cancelled",
        "Delivered",
        "Shipped",
        "Returned",
      ];
      let months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      let currentYear = new Date().getFullYear();
      let monthlyStatusCounts = new Array(labels.length).fill(0);

      monthData
        .filter((data) => data._id.month === month)
        .forEach((data) => {
          let index = labels.indexOf(data._id.status);

          if (index !== -1) {
            monthlyStatusCounts[index] = data.count;
          }
        });

      console.log(monthlyStatusCounts);
      updateChart(
        labels,
        monthlyStatusCounts,
        `Orders In ${months[month - 1]} ${currentYear}`
      );
    } else if (filterValue === "category") {
      console.log("on category filter");
      let labels = categoryData.map((data) => data.category);
      let categorySalesCounts = categoryData.map((data) => data.count);

      updateChart(labels, categorySalesCounts, `Sales Count Of Category`);
    }
  });

  if ($(".admin-dashboard-heading").length > 0) {
    let xValues = orderStatuses;
    let yValues = orderStatusCounts.map((countObj) => countObj.count);

    let myChart = new Chart("myChart", {
      type: "bar",
      data: {
        labels: xValues,
        datasets: [
          {
            backgroundColor: "#08817833",
            data: yValues,
          },
        ],
      },
      options: {
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                stepSize: 1,
              },
            },
          ],
        },
        legend: { display: false },
        title: {
          display: true,
          text: "All Time Order Statistics",
        },
      },
    });
  }

  function updateChart(labels, data, titleText) {
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = data;
    myChart.options.title.text = titleText;
    myChart.update();
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("otpExpires")) {
    otpExpiryTimestamp = urlParams.get("otpExpires");
    sessionStorage.setItem("otpExpiry", otpExpiryTimestamp);
    updateTimer();
  }
  setInterval(updateTimer, 1000);
});

if (window.history.replaceState && location.search.includes("error")) {
  window.history.replaceState({}, document.title, location.pathname);
}

let otpExpiryTimestamp = sessionStorage.getItem("otpExpiry");

function updateTimer() {
  const otpTimerElement = document.getElementById("otp-timer");
  if (!otpTimerElement) return;

  const currentTime = Date.now();
  const remainingTime = otpExpiryTimestamp - currentTime;

  if (remainingTime <= 0) {
    document.getElementById("otp-timer").textContent = "OTP expired";
    sessionStorage.removeItem("otpExpiry");
    return;
  }

  const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

  document.getElementById("otp-timer").textContent = `Expiry time: ${minutes}:${
    seconds < 10 ? "0" : ""
  }${seconds}`;
}

function setOtpExpiry() {
  otpExpiryTimestamp = Date.now() + 10 * 60 * 1000;
  sessionStorage.setItem("otpExpiry", otpExpiryTimestamp);
  updateTimer();
}

function resendOTP() {
  const email = $("#otp-email-input").val();
  fetch("/resend-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      if (data.success) {
        setOtpExpiry();
        showSuccess("OTP sent!");
      } else {
        showAlert("Error resending OTP.");
      }
    });
}

function togglePassword() {
  let passwordField = document.getElementById("password");
  let toggleSpan = passwordField.nextElementSibling;

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleSpan.textContent = "HIDE";
  } else {
    passwordField.type = "password";
    toggleSpan.textContent = "SHOW";
  }
}

function toggleConfirmPassword() {
  let confirmPasswordField = document.getElementById("confirmPassword");
  let toggleSpan = confirmPasswordField.nextElementSibling;

  if (confirmPasswordField.type === "password") {
    confirmPasswordField.type = "text";
    toggleSpan.textContent = "HIDE";
  } else {
    confirmPasswordField.type = "password";
    toggleSpan.textContent = "SHOW";
  }
}

(function ($) {
  "use strict";
  //===== jquery code for sidebar menu
  $(".menu-item.has-submenu .menu-link").on("click", function (e) {
    e.preventDefault();
    if ($(this).next(".submenu").is(":hidden")) {
      $(this).parent(".has-submenu").siblings().find(".submenu").slideUp(200);
    }
    $(this).next(".submenu").slideToggle(200);
  });

  // mobile offnavas triggerer for generic use
  $("[data-trigger]").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    let offcanvas_id = $(this).attr("data-trigger");
    $(offcanvas_id).toggleClass("show");
    $("body").toggleClass("offcanvas-active");
    $(".screen-overlay").toggleClass("show");
  });

  $(".screen-overlay, .btn-close").click(function (e) {
    $(".screen-overlay").removeClass("show");
    $(".mobile-offcanvas, .show").removeClass("show");
    $("body").removeClass("offcanvas-active");
  });

  // minimize sideber on desktop

  $(".btn-aside-minimize").on("click", function () {
    if (window.innerWidth < 768) {
      $("body").removeClass("aside-mini");
      $(".screen-overlay").removeClass("show");
      $(".navbar-aside").removeClass("show");
      $("body").removeClass("offcanvas-active");
    } else {
      // minimize sideber on desktop
      $("body").toggleClass("aside-mini");
    }
  });

  //Nice select
  if ($(".select-nice").length) {
    $(".select-nice").select2();
  }
})(jQuery);
