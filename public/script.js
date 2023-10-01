$.validator.addMethod(
  "customEmail",
  function (value, element) {
    // Standard regex for email validation
    let pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(value);
  },
  "Please enter a valid email address."
);

$(function () {
  $(".signup-form").validate({
    rules: {
      name: {
        required: true,
        minlength: 3,
      },
      email: {
        required: true,
        customEmail: true,
      },
      phoneNo: {
        required: true,
        minlength: 8,
        digits: true,
      },
      password: {
        required: true,
        minlength: 4,
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
      errorSpan.css("color", "#e63946");
    },
  });
  $(".login-form").validate({
    rules: {
      email: {
        required: true,
      },
      password: {
        required: true,
        minlength: 4,
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
      errorSpan.css("color", "#e63946");
    },
  });
  $(".admin-login-form").validate({
    rules: {
      userName: {
        required: true,
      },
      password: {
        required: true,
        minlength: 4,
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
      errorSpan.css("color", "#e63946");
    },
  });
  $(".otp-login-form").submit(function (e) {
    if ($('input[name="otp"]').parent().css("display") === "none") {
      e.preventDefault();
      $('input[name="otp"]').parent().show();
      $(".otp-wrapper").show();
      $(".otp-login-btn").text("Submit OTP");
    }
  });
  setInterval(updateTimer, 1000);
});
if (window.history.replaceState && location.search.includes("error")) {
  window.history.replaceState({}, document.title, location.pathname);
}

let expiryTimestamp = sessionStorage.getItem("otpExpiry");
console.log(expiryTimestamp)
if (!expiryTimestamp) {
  expiryTimestamp = Date.now() + 10 * 60 * 1000;
  sessionStorage.setItem("otpExpiry", expiryTimestamp);
}
function updateTimer() {
  const currentTime = Date.now();
  const remainingTime = expiryTimestamp - currentTime;

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

function resendOTP() {
  const email = $("#otp-email-input").val();
  console.log(email);
  fetch("/resend-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const newExpiryTimestamp = Date.now() + 10 * 60 * 1000;
        sessionStorage.setItem("otpExpiry", newExpiryTimestamp);
        expiryTimestamp = newExpiryTimestamp;
        updateTimer();
        alert("OTP sent!");
      } else {
        alert("Error resending OTP.");
      }
    });
}
