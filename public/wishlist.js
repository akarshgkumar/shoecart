function addToWishlist(buttonElement) {
  const productId = $(buttonElement).data('product-id');

  $.ajax({
    type: 'POST',
    url: '/add-to-wishlist',
    contentType: 'application/json',
    data: JSON.stringify({ productId }),
    success: function (data) {
      if (data.success) {
        showSuccess('Product added to wishlist');
        $("#wishlist-count").text(data.wishlistItems);
      } else if (data.alreadyExists) {
        showAlert('Item already exists in wishlist!');
      } else {
        showAlert('Failed to add product to wishlist!');
      }
    },
    error: function (error) {
      console.error('Error adding to wishlist:', error);
    },
  });
}

function addToCartOnWishlist(btn, defaultSize) {
  const productId = $(btn).data("product-id");
  const quantity = 1;

  $.ajax({
    url: "/add-to-cart",
    type: "POST",
    data: {
      productId: productId,
      size: defaultSize,
      quantity: quantity,
    },
    success: function (data) {
      if (data.success) {
        $("#cart-count").text(data.cartItems);
        showSuccess("Product added to cart");
      } else {
        showAlert('Failed to add product to cart!');
      }
    },
    error: function (error) {
      console.error('Error adding to cart:', error);
      showAlert("Error occurred while adding to cart");
    }
  });
}

function removeFromWishlist(buttonElement) {
  const productId = $(buttonElement).data('product-id');

  $.ajax({
    type: 'POST',
    url: '/remove-from-wishlist',
    contentType: 'application/json',
    data: JSON.stringify({ productId }),
    success: function(data) {
      if (data.success) {
        showSuccess('Product removed from wishlist');
        $(buttonElement).closest("tr").remove();
        $("#wishlist-count").text(data.wishlistItems);
      } else {
        showAlert('Failed to remove product from wishlist!');
      }
    },
    error: function(error) {
      console.error('Error removing from wishlist:', error);
    }
  });
}

function clearWishlist() {
  $.ajax({
    type: 'POST',
    url: '/clear-wishlist',
    success: function(data) {
      if (data.success) {
        showSuccess('Wishlist cleared');
        $("#wishlist-count").text('0');
      } else {
        showAlert('Failed to clear wishlist!');
      }
    },
  });
}