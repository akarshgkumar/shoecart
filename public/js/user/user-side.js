if (window.history.replaceState) {
  const searchParams = ["error", "orderCancelled", "notFound"];

  if (searchParams.some((param) => location.search.includes(param))) {
    window.history.replaceState({}, document.title, location.pathname);
  }
}

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

function togglePassword(clickedElement) {
  let passwordField = clickedElement.previousElementSibling;
  if (passwordField.type === "password") {
    passwordField.type = "text";
    clickedElement.textContent = "HIDE";
  } else {
    passwordField.type = "password";
    clickedElement.textContent = "SHOW";
  }
}

function updateTotalAfterDiscount() {
  if ($("#couponRow").css("display") !== "none") {
    let discountAmount = parseFloat(
      $("#couponDiscount").text().replace("₹", "").trim()
    );
    let totalAfterDiscount =
      parseFloat($("input[name='totalAmount']").val()) - discountAmount;
    
    $("input[name='totalAfterDiscount']").val(totalAfterDiscount.toFixed(2));
  } else {
    let totalAfterDiscount = parseFloat($("input[name='totalAmount']").val());
    $("input[name='totalAfterDiscount']").val(totalAfterDiscount.toFixed(2));
  }
}

function walletBalanceCheck() {
  const walletBalance = parseFloat(
    document.getElementById("walletBalanceInput").value
  );
  const totalDiscountAmount = parseFloat(
    document.getElementById("totalAfterDiscount").value
  );

  const walletPaymentDiv = document.querySelector("#wallet-balance-radio");
  const useWalletDiv = document.querySelector("#wallet-balance-checkbox");

  if (walletBalance > totalDiscountAmount) {
    walletPaymentDiv.style.display = "block";
    useWalletDiv.style.display = "none";
  } else {
    walletPaymentDiv.style.display = "none";
    useWalletDiv.style.display = "block";
  }
}

function showAlert(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert";
  alertDiv.style.position = "fixed";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "9999";
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
  }, 100);

  // Fade out and remove
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 3000);
}

function showSuccess(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert";
  alertDiv.style.position = "fixed";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "9999";
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
  }, 3000);
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
  const defaultAddressDataElement =
    document.getElementById("defaultAddressData");
  let defaultAddress;
  if (defaultAddressDataElement) {
    defaultAddress = JSON.parse(defaultAddressDataElement.textContent);
    
  }

  if ($("#walletBalanceInput").length > 0) {
    walletBalanceCheck();
  }

  let originalTotalValue = $('input[name="totalAmount"]').val();
  let originalTotal = parseFloat(originalTotalValue) || 0;
  
  let discount = 0;

  if ($('button[name="applyCoupon"]').length) {
    $('button[name="applyCoupon"]').on("click", function (e) {
      applyCoupon($('input[name="couponCode"]').val());
    });
    $('input[name="couponCode"]').on("keypress", function (e) {
      if (e.which === 13) {
        applyCoupon($('input[name="couponCode"]').val());
      }
    });
  }

  $(document).on("click", "table .apply-coupon", function (e) {
    e.preventDefault();
    const couponCode = $(this).closest("tr").find("td:first").text().trim();
    applyCoupon(couponCode);
    $('input[name="couponCode"]').val(couponCode);
    $(".coupon-table").slideToggle(400);
    $("#view-coupons-text").text("View My Coupons");
  });

  function applyCoupon(couponCode) {
    $.post("/order/apply-coupon", { couponCode }, function (data) {
      if (data.error) {
        showAlert(data.error);
      } else {
        showSuccess("Coupon applied successfully!");
        let discountPercentage = data.discountPercentage;
        discount = (originalTotal * discountPercentage) / 100;
        if ($("#couponRow").length) {
          $("#couponRow").show();
          $("#couponDiscount").html(
            "₹" + discount.toFixed(2) + '<span id="removeCoupon">Remove</span>'
          );
          updateTotalAfterDiscount();
          walletBalanceCheck();
          $("#finalTotal").text("₹" + (originalTotal - discount).toFixed(2));
        }
      }
    });
  }

  function updateTotalAfterDiscount() {
    if ($("#couponRow").css("display") !== "none") {
      let discountAmount = parseFloat(
        $("#couponDiscount").text().replace("₹", "").trim()
      );
      let totalAfterDiscount =
        parseFloat($("input[name='totalAmount']").val()) - discountAmount;
      $("input[name='totalAfterDiscount']").val(totalAfterDiscount.toFixed(2));
    } else {
      let totalAfterDiscount = parseFloat($("input[name='totalAmount']").val());
      $("input[name='totalAfterDiscount']").val(totalAfterDiscount.toFixed(2));
    }
  }

  if ($(".checkout-table").length) {
    $("#view-coupons-text").click(function () {
      var that = this;
      $(".coupon-table").slideToggle(400, function () {
        if ($(".coupon-table").is(":visible")) {
          $(that).text("Hide My Coupons");
        } else {
          $(that).text("View My Coupons");
        }
      });
    });

    $(".checkout-table").on("click", "#removeCoupon", function () {
      
      if ($("#couponRow").length) {
        $("#couponRow").hide();
        updateTotalAfterDiscount();
        walletBalanceCheck();
      }
      discount = 0;
      if ($("#finalTotal").length) {
        $("#finalTotal").text("₹" + originalTotal.toFixed(2));
      }
      if ($('input[name="couponCode"]').length) {
        $('input[name="couponCode"]').val("");
      }
    });
  }

  $("#useDefaultAddress").change(function () {
    if (this.checked) {
      $("#name").val(defaultAddress.name || "");
      $("#email").val(defaultAddress.email || "");
      $("#phone").val(defaultAddress.phoneNo || "");
      $("#cname").val(defaultAddress.companyName || "");
      $("#shipping_address").val(defaultAddress.address || "");
      $("#shipping_address2").val(defaultAddress.addressLine1 || "");
      $("#city").val(defaultAddress.city || "");
      $("#state").val(defaultAddress.state || "");
      $("#zipcode").val(defaultAddress.postalCode || "");
    } else {
      $("#name").val("");
      $("#email").val("");
      $("#phone").val("");
      $("#cname").val("");
      $("#shipping_address").val("");
      $("#shipping_address2").val("");
      $("#city").val("");
      $("#state").val("");
      $("#zipcode").val("");
    }
  });

  $(".return-reason-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      reason: {
        required: true,
      },
      additionalInfo: {
        required: true,
        minlength: 5,
        maxlength: 200,
      },
    },
    messages: {
      reason: "Please select a reason for return.",
      additionalInfo: {
        required: "Please provide additional message.",
        minlength: "Enter at least {0} characters.",
        maxlength: "Enter no more than {0} characters.",
      },
    },
    submitHandler: function (form) {
      form.submit();
    },
  });

  $(".checkout-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      name: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 100,
      },
      email: {
        required: true,
        customEmail: true,
        noSpaceStartEnd: true,
        maxlength: 50,
      },
      phone: {
        required: true,
        digits: true,
        minlength: 8,
        maxlength: 10,
      },
      cname: {
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 100,
      },
      shipping_address: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 3,
        maxlength: 100,
      },
      shipping_address2: {
        noSpaceStartEnd: true,
        minlength: 3,
        maxlength: 100,
      },
      city: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 50,
      },
      state: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 50,
      },
      zipcode: {
        required: true,
        digits: true,
        minlength: 5,
        maxlength: 6,
      },
      payment_option: {
        required: true,
      },
    },
    messages: {
      zipcode: {
        digits: "Please enter a valid postal code (digits only).",
      },
      phone: {
        digits: "Please enter a valid phone number (digits only).",
      },
      payment_option: "Please select a payment method.",
    },
    errorPlacement: function (error, element) {
      if (element.attr("name") == "payment_option") {
        error.insertAfter(".payment_option:last");
      } else {
        error.insertAfter(element);
      }
    },
    submitHandler: function (form) {
      
      let paymentOption = document.querySelector(
        'input[name="payment_option"]:checked'
      ).value;
      if ($("#walletPayment").is(":checked")) {
        let totalAfterDiscountString = $(
          'input[name="totalAfterDiscount"]'
        ).val();
        let totalAfterDiscountNumber = parseFloat(totalAfterDiscountString);
        let walletBalanceString = $('input[name="walletBalance"]').val();
        let walletBalanceNumber = parseFloat(walletBalanceString);
        if (walletBalanceNumber >= totalAfterDiscountNumber) {
          
          form.submit();
          return;
        }
      }
      if (paymentOption === "Razor Pay") {
        
        const formData = $(form).serialize();
        const userName = $("input[name='name']").val();
        const userEmail = $("input[name='email']").val();
        const userPhone = $("input[name='phone']").val();
        const userAddress = $("input[name='shipping_address']").val();
        $.ajax({
          url: "/order/place-order",
          method: "POST",
          data: formData,
          success: function (response) {
            if (response.order_id && response.amount) {
              $("<input type='hidden' name='razorpay_paid_amount' />")
                .val(response.amount / 100)
                .appendTo(form);
              var options = {
                key: RAZORPAY_KEY_ID,
                amount: response.amount,
                order_id: response.order_id,
                handler: function (response) {
                  $("<input type='hidden' name='razorpay_payment_id' />")
                    .val(response.razorpay_payment_id)
                    .appendTo(form);
                  $("<input type='hidden' name='razorpay_order_id' />")
                    .val(response.razorpay_order_id)
                    .appendTo(form);
                  $("<input type='hidden' name='razorpay_signature' />")
                    .val(response.razorpay_signature)
                    .appendTo(form);
                  

                  form.action = "/order/validate-order";
                  
                  form.submit();
                  
                },
                prefill: {
                  name: userName,
                  email: userEmail,
                  contact: userPhone,
                },
                notes: {
                  address: userAddress,
                },
                theme: {
                  color: "#088178",
                },
              };
              var rzp1 = new Razorpay(options);
              
              rzp1.open();
              rzp1.on("payment.failed", function (response) {
                showAlert(
                  "Payment failed due to network issues. Please try again."
                );
              });
            }
          },
          error: function (error) {
            showAlert("Error placing order. Please try again.");
          },
        });
      } else {
        
        form.submit();
      }
    },
  });

  $('input[name="address-select-checkout"]').on("change", function () {
    
    const selectedAddressId = $(this).data("address-id");
    const userId = $('input[name="userId"]').val();

    $.ajax({
      url: "/set-default-address",
      method: "POST",
      data: {
        userId: userId,
        addressId: selectedAddressId,
      },
      success: function (response) {
        
        window.location.href = "/order/checkout";
      },
      error: function (error) {
        
      },
    });
  });

  $('input[name="address-select"]').on("change", function () {
    
    const selectedAddressId = $(this).data("address-id");
    const userId = $('input[name="userId"]').val();

    $.ajax({
      url: "/set-default-address",
      method: "POST",
      data: {
        userId: userId,
        addressId: selectedAddressId,
      },
      success: function (response) {
        
      },
      error: function (error) {
        
      },
    });
  });
  $(".add-address-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      name: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 100,
      },
      email: {
        required: true,
        customEmail: true,
        noSpaceStartEnd: true,
        maxlength: 50,
      },
      phoneNo: {
        required: true,
        digits: true,
        minlength: 8,
        maxlength: 10,
      },
      companyName: {
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 100,
      },
      address: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 3,
        maxlength: 100,
      },
      addressLine1: {
        noSpaceStartEnd: true,
        minlength: 3,
        maxlength: 100,
      },
      city: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 50,
      },
      state: {
        required: true,
        noSpaceStartEnd: true,
        minlength: 2,
        maxlength: 50,
      },
      postalCode: {
        required: true,
        digits: true,
        minlength: 5,
        maxlength: 6,
      },
    },
    messages: {
      postalCode: {
        digits: "Please enter a valid postal code (digits only).",
      },
      phoneNo: {
        digits: "Please enter a valid phone number (digits only).",
      },
    },
    submitHandler: function (form) {
      form.submit();
    },
  });

  $(".edit-account-form").validate({
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
      name: {
        required: true,
        noSpaceMinLength: 3,
        noSpaceStartEnd: true,
        maxlength: 20,
      },
      phoneNo: {
        required: true,
        digits: true,
        minlength: 8,
        maxlength: 10,
      },

      submitHandler: function (form) {
        form.submit();
      },
    },
  });
  $(".change-password-form").validate({
    onkeyup: function (element) {
      $(element).valid();
    },
    onfocusout: function (element) {
      $(element).valid();
    },
    rules: {
      oldPassword: {
        required: true,
        noSpaceMinLength: 4,
      },
      newPassword: {
        required: true,
        noSpaceMinLength: 4,
      },
      confirmNewPassword: {
        required: true,
        noSpaceMinLength: 4,
      },
      submitHandler: function (form) {
        form.submit();
      },
    },
  });
});

(function ($) {
  "use strict";
  // Page loading
  $(window).on("load", function () {
    $("#preloader-active").delay(450).fadeOut("slow");
    $("body").delay(450).css({
      overflow: "visible",
    });
    $("#onloadModal").modal("show");
  });
  /*-----------------
      Menu Stick
  -----------------*/
  var header = $(".sticky-bar");
  var win = $(window);
  win.on("scroll", function () {
    var scroll = win.scrollTop();
    if (scroll < 200) {
      header.removeClass("stick");
      $(".header-style-2 .categori-dropdown-active-large").removeClass("open");
      $(".header-style-2 .categori-button-active").removeClass("open");
    } else {
      header.addClass("stick");
    }
  });

  /*------ ScrollUp -------- */
  $.scrollUp({
    scrollText: '<i class="fi-rs-arrow-up"></i>',
    easingType: "linear",
    scrollSpeed: 900,
    animation: "fade",
  });

  /*------ Wow Active ----*/
  new WOW().init();

  //sidebar sticky
  if ($(".sticky-sidebar").length) {
    $(".sticky-sidebar").theiaStickySidebar();
  }

  // Slider Range JS
  if ($("#slider-range").length) {
    $("#slider-range").slider({
      range: true,
      min: 0,
      max: 500,
      values: [130, 250],
      slide: function (event, ui) {
        $("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
      },
    });
    $("#amount").val(
      "$" +
        $("#slider-range").slider("values", 0) +
        " - $" +
        $("#slider-range").slider("values", 1)
    );
  }

  /*------ Hero slider 1 ----*/
  $(".hero-slider-1").slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    loop: true,
    dots: true,
    arrows: true,
    prevArrow:
      '<span class="slider-btn slider-prev"><i class="fi-rs-angle-left"></i></span>',
    nextArrow:
      '<span class="slider-btn slider-next"><i class="fi-rs-angle-right"></i></span>',
    appendArrows: ".hero-slider-1-arrow",
    autoplay: true,
  });

  /*Carausel 6 columns*/
  $(".carausel-6-columns").each(function (key, item) {
    var id = $(this).attr("id");
    var sliderID = "#" + id;
    var appendArrowsClassName = "#" + id + "-arrows";

    $(sliderID).slick({
      dots: false,
      infinite: true,
      speed: 1000,
      arrows: true,
      autoplay: true,
      slidesToShow: 6,
      slidesToScroll: 1,
      loop: true,
      adaptiveHeight: true,
      responsive: [
        {
          breakpoint: 1025,
          settings: {
            slidesToShow: 4,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
      prevArrow:
        '<span class="slider-btn slider-prev"><i class="fi-rs-angle-left"></i></span>',
      nextArrow:
        '<span class="slider-btn slider-next"><i class="fi-rs-angle-right"></i></span>',
      appendArrows: appendArrowsClassName,
    });
  });

  /*Carausel 4 columns*/
  $(".carausel-4-columns").each(function (key, item) {
    var id = $(this).attr("id");
    var sliderID = "#" + id;
    var appendArrowsClassName = "#" + id + "-arrows";

    $(sliderID).slick({
      dots: false,
      infinite: true,
      speed: 1000,
      arrows: true,
      autoplay: true,
      slidesToShow: 4,
      slidesToScroll: 1,
      loop: true,
      adaptiveHeight: true,
      responsive: [
        {
          breakpoint: 1025,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 3,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
      prevArrow:
        '<span class="slider-btn slider-prev"><i class="fi-rs-angle-left"></i></span>',
      nextArrow:
        '<span class="slider-btn slider-next"><i class="fi-rs-angle-right"></i></span>',
      appendArrows: appendArrowsClassName,
    });
  });

  /*Fix Bootstrap 5 tab & slick slider*/

  $('button[data-bs-toggle="tab"]').on("shown.bs.tab", function (e) {
    $(".carausel-4-columns").slick("setPosition");
  });

  /*------ Timer Countdown ----*/

  $("[data-countdown]").each(function () {
    var $this = $(this),
      finalDate = $(this).data("countdown");
    $this.countdown(finalDate, function (event) {
      $(this).html(
        event.strftime(
          "" +
            '<span class="countdown-section"><span class="countdown-amount hover-up">%d</span><span class="countdown-period"> days </span></span>' +
            '<span class="countdown-section"><span class="countdown-amount hover-up">%H</span><span class="countdown-period"> hours </span></span>' +
            '<span class="countdown-section"><span class="countdown-amount hover-up">%M</span><span class="countdown-period"> mins </span></span>' +
            '<span class="countdown-section"><span class="countdown-amount hover-up">%S</span><span class="countdown-period"> sec </span></span>'
        )
      );
    });
  });

  /*------ Product slider active 1 ----*/
  $(".product-slider-active-1").slick({
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    fade: false,
    loop: true,
    dots: false,
    arrows: true,
    prevArrow:
      '<span class="pro-icon-1-prev"><i class="fi-rs-angle-small-left"></i></span>',
    nextArrow:
      '<span class="pro-icon-1-next"><i class="fi-rs-angle-small-right"></i></span>',
    responsive: [
      {
        breakpoint: 1199,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });

  /*------ Testimonial active 1 ----*/
  $(".testimonial-active-1").slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    fade: false,
    loop: true,
    dots: false,
    arrows: true,
    prevArrow:
      '<span class="pro-icon-1-prev"><i class="fi-rs-angle-small-left"></i></span>',
    nextArrow:
      '<span class="pro-icon-1-next"><i class="fi-rs-angle-small-right"></i></span>',
    responsive: [
      {
        breakpoint: 1199,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });

  /*------ Testimonial active 3 ----*/
  $(".testimonial-active-3").slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    fade: false,
    loop: true,
    dots: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1199,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });

  /*------ Categories slider 1 ----*/
  $(".categories-slider-1").slick({
    slidesToShow: 6,
    slidesToScroll: 1,
    fade: false,
    loop: true,
    dots: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 1199,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });

  /*----------------------------
      Category toggle function
  ------------------------------*/
  // var searchToggle = $(".categori-button-active");
  // searchToggle.on("click", function (e) {
  //   e.preventDefault();
  //   if ($(this).hasClass("open")) {
  //     $(this).removeClass("open");
  //     $(this).siblings(".categori-dropdown-active-large").removeClass("open");
  //   } else {
  //     $(this).addClass("open");
  //     $(this).siblings(".categori-dropdown-active-large").addClass("open");
  //   }
  // });

  /*---------------------
      Price range
  --------------------- */
  var sliderrange = $("#slider-range");
  var amountprice = $("#amount");
  $(function () {
    sliderrange.slider({
      range: true,
      min: 16,
      max: 400,
      values: [0, 300],
      slide: function (event, ui) {
        amountprice.val("$" + ui.values[0] + " - $" + ui.values[1]);
      },
    });
    amountprice.val(
      "$" +
        sliderrange.slider("values", 0) +
        " - $" +
        sliderrange.slider("values", 1)
    );
  });

  /*-------------------------------
      Sort by active
  -----------------------------------*/
  if ($(".sort-by-product-area").length) {
    var $body = $("body"),
      $cartWrap = $(".sort-by-product-area"),
      $cartContent = $cartWrap.find(".sort-by-dropdown");
    $cartWrap.on("click", ".sort-by-product-wrap", function (e) {
      e.preventDefault();
      var $this = $(this);
      if (!$this.parent().hasClass("show")) {
        $this
          .siblings(".sort-by-dropdown")
          .addClass("show")
          .parent()
          .addClass("show");
      } else {
        $this
          .siblings(".sort-by-dropdown")
          .removeClass("show")
          .parent()
          .removeClass("show");
      }
    });
    /*Close When Click Outside*/
    $body.on("click", function (e) {
      var $target = e.target;
      if (
        !$($target).is(".sort-by-product-area") &&
        !$($target).parents().is(".sort-by-product-area") &&
        $cartWrap.hasClass("show")
      ) {
        $cartWrap.removeClass("show");
        $cartContent.removeClass("show");
      }
    });
  }

  /*-----------------------
      Shop filter active
  ------------------------- */
  $(".shop-filter-toogle").on("click", function (e) {
    e.preventDefault();
    $(".shop-product-fillter-header").slideToggle();
  });
  var shopFiltericon = $(".shop-filter-toogle");
  shopFiltericon.on("click", function () {
    $(".shop-filter-toogle").toggleClass("active");
  });

  /*-------------------------------------
      Product details big image slider
  ---------------------------------------*/
  $(".pro-dec-big-img-slider").slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    draggable: false,
    fade: false,
    asNavFor: ".product-dec-slider-small , .product-dec-slider-small-2",
  });

  /*---------------------------------------
      Product details small image slider
  -----------------------------------------*/
  $(".product-dec-slider-small").slick({
    slidesToShow: 4,
    slidesToScroll: 1,
    asNavFor: ".pro-dec-big-img-slider",
    dots: false,
    focusOnSelect: true,
    fade: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  });

  /*-----------------------
      Magnific Popup
  ------------------------*/
  $(".img-popup").magnificPopup({
    type: "image",
    gallery: {
      enabled: true,
    },
  });

  $(".btn-close").on("click", function (e) {
    $(".zoomContainer").remove();
  });
  $("#quickViewModal").on("show.bs.modal", function (e) {
    $(document).click(function (e) {
      var modalDialog = $(".modal-dialog");
      if (!modalDialog.is(e.target) && modalDialog.has(e.target).length === 0) {
        $(".zoomContainer").remove();
      }
    });
  });

  /*---------------------
      Select active
  --------------------- */
  $(".select-active").select2();

  /*--- Checkout toggle function ----*/
  $(".checkout-click1").on("click", function (e) {
    e.preventDefault();
    $(".checkout-login-info").slideToggle(900);
  });

  /*--- Checkout toggle function ----*/
  $(".checkout-click3").on("click", function (e) {
    e.preventDefault();
    $(".checkout-login-info3").slideToggle(1000);
  });

  /*-------------------------
      Create an account toggle
  --------------------------*/
  $(".checkout-toggle2").on("click", function () {
    $(".open-toggle2").slideToggle(1000);
  });

  $(".checkout-toggle").on("click", function () {
    $(".open-toggle").slideToggle(1000);
  });

  /*-------------------------------------
      Checkout paymentMethod function
  ---------------------------------------*/
  paymentMethodChanged();
  function paymentMethodChanged() {
    var $order_review = $(".payment-method");

    $order_review.on("click", 'input[name="payment_method"]', function () {
      var selectedClass = "payment-selected";
      var parent = $(this).parents(".sin-payment").first();
      parent.addClass(selectedClass).siblings().removeClass(selectedClass);
    });
  }

  /*---- CounterUp ----*/
  $(".count").counterUp({
    delay: 10,
    time: 2000,
  });

  // Isotope active
  $(".grid").imagesLoaded(function () {
    // init Isotope
    var $grid = $(".grid").isotope({
      itemSelector: ".grid-item",
      percentPosition: true,
      layoutMode: "masonry",
      masonry: {
        // use outer width of grid-sizer for columnWidth
        columnWidth: ".grid-item",
      },
    });
  });

  /*====== SidebarSearch ======*/
  function sidebarSearch() {
    var searchTrigger = $(".search-active"),
      endTriggersearch = $(".search-close"),
      container = $(".main-search-active");

    searchTrigger.on("click", function (e) {
      e.preventDefault();
      container.addClass("search-visible");
    });

    endTriggersearch.on("click", function () {
      container.removeClass("search-visible");
    });
  }
  sidebarSearch();

  /*====== Sidebar menu Active ======*/
  function mobileHeaderActive() {
    var navbarTrigger = $(".burger-icon"),
      endTrigger = $(".mobile-menu-close"),
      container = $(".mobile-header-active"),
      wrapper4 = $("body");

    wrapper4.prepend('<div class="body-overlay-1"></div>');

    navbarTrigger.on("click", function (e) {
      e.preventDefault();
      container.addClass("sidebar-visible");
      wrapper4.addClass("mobile-menu-active");
    });

    endTrigger.on("click", function () {
      container.removeClass("sidebar-visible");
      wrapper4.removeClass("mobile-menu-active");
    });

    $(".body-overlay-1").on("click", function () {
      container.removeClass("sidebar-visible");
      wrapper4.removeClass("mobile-menu-active");
    });
  }
  mobileHeaderActive();

  /*---------------------
      Mobile menu active
  ------------------------ */
  var $offCanvasNav = $(".mobile-menu"),
    $offCanvasNavSubMenu = $offCanvasNav.find(".dropdown");

  /*Add Toggle Button With Off Canvas Sub Menu*/
  $offCanvasNavSubMenu
    .parent()
    .prepend(
      '<span class="menu-expand"><i class="fi-rs-angle-small-down"></i></span>'
    );

  /*Close Off Canvas Sub Menu*/
  $offCanvasNavSubMenu.slideUp();

  /*Category Sub Menu Toggle*/
  $offCanvasNav.on("click", "li a, li .menu-expand", function (e) {
    var $this = $(this);
    if (
      $this
        .parent()
        .attr("class")
        .match(/\b(menu-item-has-children|has-children|has-sub-menu)\b/) &&
      ($this.attr("href") === "#" || $this.hasClass("menu-expand"))
    ) {
      e.preventDefault();
      if ($this.siblings("ul:visible").length) {
        $this.parent("li").removeClass("active");
        $this.siblings("ul").slideUp();
      } else {
        $this.parent("li").addClass("active");
        $this
          .closest("li")
          .siblings("li")
          .removeClass("active")
          .find("li")
          .removeClass("active");
        $this.closest("li").siblings("li").find("ul:visible").slideUp();
        $this.siblings("ul").slideDown();
      }
    }
  });

  /*--- language currency active ----*/
  $(".mobile-language-active").on("click", function (e) {
    e.preventDefault();
    $(".lang-dropdown-active").slideToggle(900);
  });

  /*--- Categori-button-active-2 ----*/
  $(".categori-button-active-2").on("click", function (e) {
    e.preventDefault();
    $(".categori-dropdown-active-small").slideToggle(900);
  });

  /*--- Mobile demo active ----*/
  var demo = $(".tm-demo-options-wrapper");
  $(".view-demo-btn-active").on("click", function (e) {
    e.preventDefault();
    demo.toggleClass("demo-open");
  });

  /*-----More Menu Open----*/
  $(".more_slide_open").slideUp();
  $(".more_categories").on("click", function () {
    $(this).toggleClass("show");
    $(".more_slide_open").slideToggle();
  });

  $(".modal").on("shown.bs.modal", function (e) {
    $(".product-image-slider").slick("setPosition");
    $(".slider-nav-thumbnails").slick("setPosition");
    $(".product-image-slider .slick-active img").elevateZoom({
      zoomType: "inner",
      cursor: "crosshair",
      zoomWindowFadeIn: 500,
      zoomWindowFadeOut: 750,
    });
  });

  /*--- VSticker ----*/
  $("#news-flash").vTicker({
    speed: 500,
    pause: 3000,
    animation: "fade",
    mousePause: false,
    showItems: 1,
  });
})(jQuery);
