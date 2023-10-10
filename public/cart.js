$(function () {
  $(".addToCartButton").on("click", function () {
    addToCart(this);
  });
  $(".removeFromCartButton").on("click", function () {
    removeFromCart(this);
  });
});

function addToCart(buttonElement) {
  const productId = $(buttonElement).data("product-id");

  $.ajax({
    type: "POST",
    url: "/add-to-cart",
    contentType: "application/json",
    data: JSON.stringify({
      productId
    }),
    success: function (data) {
      if (data.success) {
        $("#cart-count").text(data.cartItems);
      } else {
        alert("Failed to add product to cart!");
      }
    },
  });
}

function removeFromCart(buttonElement) {
  const productId = $(buttonElement).data("product-id");

  $.ajax({
    type: "POST",
    url: "/remove-from-cart",
    contentType: "application/json",
    data: JSON.stringify({ productId }),
    success: function (data) {
      if (data.success) {

        if (data.success) {
          $(buttonElement).closest('tr').remove();
          $("#cart-count").text(data.cartItems);
        } else {
          alert("Failed to remove product from cart!");
        }
      }
    }
  });
}