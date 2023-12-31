let selectedSize = null;

function changeSelectedSize(size) {
  selectedSize = size;
}

function updateTotalAndSubtotal() {
  let total = 0;
  $(".shopping-summery tbody tr:not(:last-child)").each(function () {
    let subtotal = parseFloat(
      $(this).find(".product-subtotal span").text().replace("₹ ", "")
    );
    total += subtotal;
  });

  $(".cart_total_amount span").text(`₹ ${total.toFixed(2)}`);
  $(".cart_total_amount strong span").text(`₹ ${total.toFixed(2)}`);
}

function removeFromCart(buttonElement) {
  const productId = $(buttonElement).data("product-id");

  $.ajax({
    type: "POST",
    url: "/cart/remove-from-cart",
    contentType: "application/json",
    data: JSON.stringify({ productId }),
    success: function (data) {
      if (data.success) {
        $(buttonElement).closest("tr").remove();
        $("#cart-count").text(data.cartItems);
        $("#cart-count-mobile").text(data.cartItems);
        updateTotalAndSubtotal();
        showSuccess("Product removed from cart");
        if (data.cartItems === 0) {
          $(".product-exists-div").hide();
          $("#no-products-div").show();
        }
      } else {
        showAlert("Failed to remove product from cart!");
      }
    },
    error: function (error) {
      console.error("Error removing product to cart:", error);
      showAlert("Unexpected error occurred");
    },
  });
}

$(function () {
  $("#proceedToCheckoutBtn").click(function (event) {
    event.preventDefault();

    const userId = $("#hiddenUserId").val();

    let canProceedToCheckout = true;

    $("select[name='product_size'] option:selected").each(function () {
      const selectedValue = $(this).val();
      
      if (selectedValue === "") {
          canProceedToCheckout = false;
          return false;
      }
  });
    if (!canProceedToCheckout) {
      showAlert("Please select a valid size for all products.");
      return;
    }
    $.ajax({
      url: "/order/validate-cart",
      method: "POST",
      data: { userId: userId },
      dataType: "json",
      success: function (response) {
        
        if (response.status === "success") {
          window.location.href = "/order/checkout";
        } else {
          showAlert(response.message);
        }
      },
      error: function (err) {
        console.error("An error occurred:", err);
      },
    });
    console.log(canProceedToCheckout)
  });

  $(".removeFromCartButton").on("click", function () {
    $("#confirmRemoveModal").modal("show");
    const removeFromCartBtn = this;

    $("#confirmRemoveBtn").on("click", function () {
      removeFromCart(removeFromCartBtn);
      $("#confirmRemoveModal").modal("hide");
    });
  });

  $(".cart-qty-up, .cart-qty-down").on("click", function () {
    let $qtyContainer = $(this).closest(".detail-qty");
    let $qtyVal = $qtyContainer.find(".qty-val");
    let currentQty = parseInt($qtyVal.text());

    if (currentQty < 1) currentQty = 1;
    let productId = $qtyContainer.data("product-id");
    let price = parseFloat($qtyVal.data("product-price"));
    let newSubtotal = currentQty * price;

    $qtyVal.text(currentQty);

    $qtyContainer
      .closest("tr")
      .find(".product-subtotal span")
      .text(`₹ ${newSubtotal.toFixed(2)}`);

    $.ajax({
      type: "POST",
      url: "/cart/update-cart-quantity",
      contentType: "application/json",
      data: JSON.stringify({ productId, quantity: currentQty }),
      success: function (data) {
        if (!data.success) {
          showAlert("Failed to update product quantity!");
        } else {
          $("#cart-count").text(data.cartItems);
          $("#cart-count-mobile").text(data.cartItems);
          updateTotalAndSubtotal();
        }
      },
      error: function (error) {
        console.error("Error updating quantity:", error);
        showAlert("Unexpected error occurred");
      },
    });
  });
});

function addToCart(btn, defaultSize) {
  const productId = $(btn).data("product-id");
  const sizeToUse = selectedSize || defaultSize;
  
  const quantity = parseInt($(".detail-qty .qty-val").text()) || 1;

  $.ajax({
    url: "/cart/add-to-cart",
    type: "POST",
    data: {
      productId: productId,
      size: sizeToUse,
      quantity: quantity,
    },
    success: function (data) {
      if (data.success) {
        $("#cart-count").text(data.cartItems);
        $("#cart-count-mobile").text(data.cartItems);
        updateTotalAndSubtotal();
        showSuccess("Product added to cart");
      } else {
        showAlert(data.message);
      }
    },
    error: function (error) {
      console.error("Error adding product to cart:", error);
      showAlert("Unexpected error occurred");
    },
  });
}
