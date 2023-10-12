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

function showAlert(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert";
  alertDiv.style.position = "fixed";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "2000";
  alertDiv.style.top = "60px";
  alertDiv.style.opacity = "0";
  alertDiv.style.transition = "opacity 0.5s ease-in-out";
  alertDiv.style.backgroundColor = "#D80032"; // Red
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

function deleteOrder(orderId) {
  $.ajax({
      url: `/admin/delete-order/${orderId}`,
      method: 'DELETE',
      dataType: 'json',
      success: function(data) {
          if(data.message) {
              showSuccess("Order deleted succesfully"); // Notify user
              location.reload();  // Reload the page to reflect changes
          }
      },
      error: function(jqXHR, textStatus, errorThrown) {
          console.error('Error:', errorThrown);
          alert('Error deleting order.'); // Notify user of the error
      }
  });
}

$(function () {
  $(".stock-form").validate({
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
    rules: {
      product_name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 50,
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
      estProfit: {
        required: true,
        min: 0,
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
  $(".product-form").validate({
    rules: {
      product_name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 50,
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
      estProfit: {
        required: true,
        min: 0,
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

  $(".login-form").validate({
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
    rules: {
      category_name: {
        required: true,
        noSpaceStartEnd: true,
        noSpaceMinLength: 3,
        maxlength: 10,
      },
    },
    messages: {
      category_name: {
        required: "Please enter a category name",
      },
    },
    errorPlacement: function (error, element) {
      if (element.next(".error-span").length) {
        error.appendTo(element.next(".error-span"));
      } else {
        error.insertAfter(element);
      }
    },
    submitHandler: function (form) {
      const categoryNameInput = $("#category_name");
      const categoryName = categoryNameInput.val();

      $.get(`/admin/check-category/${categoryName}`)
        .done(function (response) {
          if (response.exists) {
            $(".error-span").text("Category name already exists");
            categoryNameInput.focus();
          } else {
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
    rules: {
      brand_name: {
        required: true,
        noSpaceStartEnd: true,
        noSpaceMinLength: 3,
        maxlength: 10,
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

  $("#category_name").on("input", function () {
    const categoryName = $(this).val();

    if (categoryName.trim()) {
      $.get(`/admin/check-category/${categoryName}`)
        .done(function (response) {
          if (response.exists) {
            $(".error-span").text("category name already exists");
          } else {
            $(".error-span").text("");
          }
        })
        .fail(function (error) {
          console.error("Error checking category:", error);
        });
    } else {
      $(".error-span").text("");
    }
  });

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
        alert("OTP sent!");
      } else {
        alert("Error resending OTP.");
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
    var offcanvas_id = $(this).attr("data-trigger");
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
  // Perfect Scrollbar
  if ($("#offcanvas_aside").length) {
    const demo = document.querySelector("#offcanvas_aside");
    const ps = new PerfectScrollbar(demo);
  }
})(jQuery);
