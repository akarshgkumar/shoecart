$.validator.addMethod(
  "customEmail",
  function (value, element) {
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
      } else {
        error.insertAfter(element);
      }
    },
  });

  setInterval(updateTimer, 1000);
});
if (window.history.replaceState && location.search.includes("error")) {
  window.history.replaceState({}, document.title, location.pathname);
}

let expiryTimestamp = sessionStorage.getItem("otpExpiry");
console.log(expiryTimestamp);
if (!expiryTimestamp) {
  expiryTimestamp = Date.now() + 10 * 60 * 1000;
  sessionStorage.setItem("otpExpiry", expiryTimestamp);
}
function updateTimer() {
  const otpTimerElement = document.getElementById("otp-timer");
  if (!otpTimerElement) return;

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

(function ($) {
  "use strict";
//===== jquery code for sidebar menu
$('.menu-item.has-submenu .menu-link').on('click', function(e){
  e.preventDefault();
  if($(this).next('.submenu').is(':hidden')){
    $(this).parent('.has-submenu').siblings().find('.submenu').slideUp(200);
  } 
  $(this).next('.submenu').slideToggle(200);
});

// mobile offnavas triggerer for generic use
$("[data-trigger]").on("click", function(e){
  e.preventDefault();
  e.stopPropagation();
  var offcanvas_id =  $(this).attr('data-trigger');
  $(offcanvas_id).toggleClass("show");
  $('body').toggleClass("offcanvas-active");
  $(".screen-overlay").toggleClass("show");

}); 

$(".screen-overlay, .btn-close").click(function(e){
  $(".screen-overlay").removeClass("show");
  $(".mobile-offcanvas, .show").removeClass("show");
  $("body").removeClass("offcanvas-active");
}); 

// minimize sideber on desktop

$('.btn-aside-minimize').on('click', function(){
  if( window.innerWidth < 768) {
    $('body').removeClass('aside-mini');
    $(".screen-overlay").removeClass("show");
    $(".navbar-aside").removeClass("show");
    $("body").removeClass("offcanvas-active");
  } 
  else {
    // minimize sideber on desktop
    $('body').toggleClass('aside-mini');
  }
});

//Nice select
if ($('.select-nice').length) {
    $('.select-nice').select2();
}
// Perfect Scrollbar
if ($('#offcanvas_aside').length) {
  const demo = document.querySelector('#offcanvas_aside');
  const ps = new PerfectScrollbar(demo);
}

// Dark mode toogle
$('.darkmode').on('click', function () {
  $('body').toggleClass("dark");
});

})(jQuery);

