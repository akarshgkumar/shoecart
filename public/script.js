$.validator.addMethod(
  "customEmail",
  function (value, element) {
    let pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(value);
  },
  "Please enter a valid email address."
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

$(function () {
  $(".edit-product-form").validate({
    rules: {
      product_name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true
      },
      product_color: {
        required: true,
        noSpaceStartEnd: true
      },
      product_brand: {
        required: true,
      },
      price: {
        required: true,
        min: 0,
        digits: true
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
        noSpaceStartEnd: true
      },
      mainImage: {
        extension: "jpeg|jpg|png|gif|webp",
      },
      image: {
        extension: "jpeg|jpg|png|gif|webp",
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
        minlength: "Product name should be at least 2 characters",
      },
      product_color: {
        required: "Please enter a color",
        pattern:
          "Only colors: white, black, orange, red, yellow, green, purple are allowed",
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
        noSpaceStartEnd: true
      },
      product_color: {
        required: true,
        noSpaceStartEnd: true
      },
      product_brand: {
        required: true,
      },
      price: {
        required: true,
        min: 0,
        digits: true
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
        extension: "jpeg|jpg|png|gif|webp",
      },
      image: {
        required: true,
        extension: "jpeg|jpg|png|gif|webp",
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
        required: "Please enter a color"
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
      },
      email: {
        required: true,
        customEmail: true,
      },
      phoneNo: {
        required: true,
        minlength: 10,
        digits: true,
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
  $(".login-form").validate({
    rules: {
      email: {
        required: true,
        customEmail: true,
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

  // Dark mode toogle
  $(".darkmode").on("click", function () {
    $("body").toggleClass("dark");
  });
})(jQuery);
